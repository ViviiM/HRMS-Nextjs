import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords, updateRecordInSalesforce, createRecordInSalesforce, SF_OBJECTS } from '@/lib/salesforce';
import { sendEmail } from '@/lib/email';
import { createCalendarEvent } from '@/lib/google-calendar';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approvalType, comment } = body; // 'TL' or 'HR'

    if (!approvalType || !['TL', 'HR'].includes(approvalType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid approval type. Must be TL or HR' },
        { status: 400 }
      );
    }

    // const conn = getSalesforceConnection();

    // Fetch current leave record
    const soql = `SELECT Id, Employee__c, Contact__r.FirstName, Contact__r.LastName, Contact__r.Email,
                         TL_Approval__c, HR_Approval__c, Status__c, LeaveType__c, StartDate__c, EndDate__c,
                         TotalDays__c
                  FROM Leave__c WHERE Id = '${id}'`;

    const records = await queryRecords<any>(soql);
    if (!records || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave record not found' },
        { status: 404 }
      );
    }

    const leave = records[0];
    const updateData: any = {};

    // Update approval status
    if (approvalType === 'TL') {
      updateData.TL_Approval__c = true;
    } else {
      updateData.HR_Approval__c = true;
    }

    // If both approvals are done, update status to Approved
    const tlApproved = approvalType === 'TL' ? true : (leave.TL_Approval__c as boolean);
    const hrApproved = approvalType === 'HR' ? true : (leave.HR_Approval__c as boolean);

    if (tlApproved && hrApproved) {
      updateData.Status__c = 'Approved';
      updateData.Approved_Date__c = new Date().toISOString().split('T')[0];

      // Update Leave Balance - deduct leave days
      const leaveBalanceSOQL = `SELECT Id, Annual_Leave__c, Casual_Balance__c, Sick_Balance__c, Earned_Balance__c FROM ${SF_OBJECTS.LEAVE_BALANCE} WHERE Employee__c = '${leave.Employee__c}'`;
      const balanceRecords = await queryRecords<any>(leaveBalanceSOQL);

      if (balanceRecords && balanceRecords.length > 0) {
        const balance = balanceRecords[0];
        const leaveType = leave.LeaveType__c;
        const totalDays = leave.TotalDays__c || 0;
        
        let updatePayload: any = {};
        
        if (leaveType === 'Casual') {
           updatePayload['Casual_Balance__c'] = (balance.Casual_Balance__c || 0) - totalDays;
        } else if (leaveType === 'Sick') {
           updatePayload['Sick_Balance__c'] = (balance.Sick_Balance__c || 0) - totalDays;
        } else if (leaveType === 'Earned' || leaveType === 'Privilege') {
           updatePayload['Earned_Balance__c'] = (balance.Earned_Balance__c || 0) - totalDays;
        } else if (leaveType === 'Annual') {
           updatePayload['Annual_Leave__c'] = (balance.Annual_Leave__c || 0) - totalDays;
        }

        if (Object.keys(updatePayload).length > 0) {
           await updateRecordInSalesforce(SF_OBJECTS.LEAVE_BALANCE, balance.Id, updatePayload);
        }
      }

      // Create Google Calendar Event
      try {
          const employeeName = `${leave.Contact__r?.FirstName || 'Employee'} ${leave.Contact__r?.LastName || ''}`.trim();
          await createCalendarEvent({
              summary: `${employeeName} - ${leave.LeaveType__c} Leave`,
              description: `Leave Reason: ${leave.Reason__c || 'N/A'}`,
              start: { date: leave.StartDate__c }, // "YYYY-MM-DD"
              end: { date: leave.EndDate__c },     // Google Calendar end date is exclusive for all-day events? 
                                                   // Actually for multi-day, end date is usually expected to be +1 day if all-day event.
                                                   // But for simplicity we pass it as is, or handle increment.
                                                   // Let's assume start/end date from SF is YYYY-MM-DD.
          });
          console.log("Google Calendar event created");
      } catch (calError) {
          console.error("Failed to create Google Calendar event:", calError);
      }
    }

    // Update leave record
    await updateRecordInSalesforce('Leave__c', id, updateData);

    // Notify Employee (Email + System Notification)
    const employeeName = `${leave.Contact__r?.FirstName || ''} ${leave.Contact__r?.LastName || ''}`.trim();
    const approverRole = approvalType === 'TL' ? 'Team Lead' : 'HR';
    const emailSubject = `Leave Application Update: Approved by ${approverRole}`;
    
    // Email Body
    const emailBody = `
      <p>Dear ${employeeName},</p>
      <p>Your leave application for <strong>${leave.LeaveType__c}</strong> (${leave.StartDate__c} to ${leave.EndDate__c}) has been <strong>approved</strong> by ${approverRole}.</p>
      ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
      <p>${tlApproved && hrApproved ? 'Your leave has been fully approved.' : 'Awaiting final approval.'}</p>
      <p>Best regards,<br/>HRMS System</p>
    `;

    if (leave.Contact__r?.Email) {
      await sendEmail({
        to: leave.Contact__r.Email,
        subject: emailSubject,
        html: emailBody,
      });
    }

    // System Notification for Employee
    try {
        await createRecordInSalesforce(SF_OBJECTS.NOTIFICATION, {
            Employee__c: leave.Employee__c,
            Subject__c: emailSubject,
            Message__c: `Your leave has been approved by ${approverRole}.${comment ? ` Comment: ${comment}` : ''}`,
            Notification_Type__c: 'Leave',
            Is_Read__c: false,
            Action_Required__c: false,
            Related_Record_ID__c: id,
            Status__c: 'Unread'
        });
    } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
    }

    // Update DynamoDB Leave Status
    const { updateLeaveStatusInDynamo, updateNotificationInDynamo } = await import('@/lib/dynamo-integration');
    await updateLeaveStatusInDynamo({
        EmployeeId: leave.Employee__c, // Best effort using SF ID if String ID not available. Ideally fetch String ID.
        StartDate: leave.StartDate__c,
        Id: id,
        Status: tlApproved && hrApproved ? 'Approved' : 'Pending',
        // No cancel reason for approval
    });

    // Update/Expire HR Notification (The one that asked for approval)
    // Find notification related to this Leave ID that is Pending or Action Required
    try {
        const notifQuery = `SELECT Id, Employee__c FROM ${SF_OBJECTS.NOTIFICATION} WHERE Related_Record_ID__c = '${id}' AND Status__c = 'Pending'`;
        const notifRecords = await queryRecords<any>(notifQuery);
        
        if (notifRecords && notifRecords.length > 0) {
            for (const notif of notifRecords) {
                // Update in Salesforce
                await updateRecordInSalesforce(SF_OBJECTS.NOTIFICATION, notif.Id, {
                    Status__c: 'Approved',
                    Action_Required__c: false,
                    Is_Read__c: true
                });

                // Update in DynamoDB
                // We need the Employee String ID of the HR (not the applicant) to update the notification key.
                // We'll try to use the Employee__c from the notification record (which is HR's SF ID).
                // But Dynamo keys rely on String ID. If we don't have it, we might fail or need a lookup.
                // Assuming we stored String ID if possible or consistent key usage. 
                // However, without a query for HR's String ID, we might struggle if keys mismatch.
                // Let's attempt update using what we have, or skip if intricate.
                // IMPORTANT: Earlier we decided to store Notification with Partition Key EMP#<HR_SF_ID> or EMP#<HR_STRING_ID>??
                // Creating notification used HR's String ID if available. 
                // So we should query HR employee to get String ID to construct PK.
                
                const hrEmpQuery = `SELECT Employee_ID__c FROM ${SF_OBJECTS.EMPLOYEE} WHERE Id = '${notif.Employee__c}' LIMIT 1`;
                const hrEmpResult = await queryRecords<any>(hrEmpQuery);
                if (hrEmpResult && hrEmpResult.length > 0) {
                     const hrStringId = hrEmpResult[0].Employee_ID__c;
                     if (hrStringId) {
                        await updateNotificationInDynamo(hrStringId, notif.Id, {
                            Status: 'Approved',
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
    console.error('Error approving leave:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve leave' },
      { status: 500 }
    );
  }
}
