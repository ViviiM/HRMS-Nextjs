import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords, updateRecordInSalesforce, createRecordInSalesforce, SF_OBJECTS } from '@/lib/salesforce';
import { sendEmail } from '@/lib/email';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason, rejectionType } = body; // rejectionType: 'TL' | 'HR'

    if (!rejectionType || !['TL', 'HR'].includes(rejectionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid rejection type. Must be TL or HR' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // const conn = getSalesforceConnection();

    // Fetch current leave record
    const soql = `SELECT Id, Employee__c, Contact__r.FirstName, Contact__r.LastName, Contact__r.Email,
                         TL_Approval__c, HR_Approval__c, Status__c, LeaveType__c, StartDate__c, EndDate__c
                  FROM Leave__c WHERE Id = '${id}'`;

    const records = await queryRecords<any>(soql);
    if (!records || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave record not found' },
        { status: 404 }
      );
    }

    const leave = records[0];
    const updateData: any = {
      Status__c: 'Rejected',
    };

    // Store rejection reason
    if (rejectionType === 'TL') {
      updateData.Cancel_Reason_TL__c = reason;
    } else {
      updateData.Cancel_Reason_HR__c = reason;
    }

    // Update leave record
    await updateRecordInSalesforce('Leave__c', id, updateData);

    // Notify Employee
    const employeeName = `${leave.Contact__r?.FirstName || ''} ${leave.Contact__r?.LastName || ''}`.trim();
    const rejectorRole = rejectionType === 'TL' ? 'Team Lead' : 'HR';
    const emailSubject = `Leave Application Rejected by ${rejectorRole}`;
    
    const emailBody = `
      <p>Dear ${employeeName},</p>
      <p>Unfortunately, your leave application for <strong>${leave.LeaveType__c}</strong> (${leave.StartDate__c} to ${leave.EndDate__c}) has been <strong>rejected</strong> by ${rejectorRole}.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please contact your ${rejectorRole} for further discussion.</p>
      <p>Best regards,<br/>HRMS System</p>
    `;

    if (leave.Contact__r?.Email) {
      await sendEmail({
        to: leave.Contact__r.Email,
        subject: emailSubject,
        html: emailBody,
      });
    }

    // System Notification
    try {
        await createRecordInSalesforce(SF_OBJECTS.NOTIFICATION, {
            Employee__c: leave.Employee__c,
            Subject__c: emailSubject,
            Message__c: `Your leave has been rejected by ${rejectorRole}. Reason: ${reason}`,
            Notification_Type__c: 'Leave',
            Is_Read__c: false,
            Action_Required__c: false, // Info only
            Related_Record_ID__c: id,
            Status__c: 'Unread'
        });
    } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
    }

    // Update DynamoDB Leave Status
    const { updateLeaveStatusInDynamo, updateNotificationInDynamo } = await import('@/lib/dynamo-integration');
    await updateLeaveStatusInDynamo({
        EmployeeId: leave.Employee__c, 
        StartDate: leave.StartDate__c,
        Id: id,
        Status: 'Rejected',
        CancelReason: reason
    });

    // Update/Expire HR Notification
    try {
        const notifQuery = `SELECT Id, Employee__c FROM ${SF_OBJECTS.NOTIFICATION} WHERE Related_Record_ID__c = '${id}' AND Status__c = 'Pending'`;
        const notifRecords = await queryRecords<any>(notifQuery);
        
        if (notifRecords && notifRecords.length > 0) {
            for (const notif of notifRecords) {
                // Update in Salesforce
                await updateRecordInSalesforce(SF_OBJECTS.NOTIFICATION, notif.Id, {
                    Status__c: 'Rejected',
                    Action_Required__c: false,
                    Is_Read__c: true
                });

                // Update in DynamoDB
                const hrEmpQuery = `SELECT Employee_ID__c FROM ${SF_OBJECTS.EMPLOYEE} WHERE Id = '${notif.Employee__c}' LIMIT 1`;
                const hrEmpResult = await queryRecords<any>(hrEmpQuery);
                if (hrEmpResult && hrEmpResult.length > 0) {
                     const hrStringId = hrEmpResult[0].Employee_ID__c;
                     if (hrStringId) {
                        await updateNotificationInDynamo(hrStringId, notif.Id, {
                            Status: 'Rejected',
                            ActionRequired: false,
                            IsRead: true
                        });
                     }
                }
            }
        }
    } catch (e) {
        console.error("Failed to update previous notifications:", e);
    }

    return NextResponse.json(
      { success: true, data: { ...leave, ...updateData } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error rejecting leave:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reject leave' },
      { status: 500 }
    );
  }
}
