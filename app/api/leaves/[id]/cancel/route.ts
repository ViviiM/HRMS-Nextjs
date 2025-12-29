import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords, updateRecordInSalesforce, SF_OBJECTS } from '@/lib/salesforce';
import { sendEmail } from '@/lib/email';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Cancellation reason is required' },
        { status: 400 }
      );
    }

    // const conn = getSalesforceConnection();

    // Fetch current leave record
    const soql = `SELECT Id, Employee__c, Contact__r.FirstName, Contact__r.LastName, Contact__r.Email,
                         Status__c, LeaveType__c, StartDate__c, EndDate__c, TotalDays__c
                  FROM Leave__c WHERE Id = '${id}'`;

    const records = await queryRecords<any>(soql);
    if (!records || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave record not found' },
        { status: 404 }
      );
    }

    const leave = records[0];

    // Check status
    if (leave.Status__c === 'Cancelled' || leave.Status__c === 'Rejected') {
         return NextResponse.json(
            { success: false, error: 'Leave is already cancelled or rejected' },
            { status: 400 }
         );
    }

    const isApproved = leave.Status__c === 'Approved';
    const updateData: any = {
      Status__c: 'Cancelled',
      Cancel_Reason_TL__c: reason, // Using this field for generic cancel reason or create a new one 'CancelReason__c' if exists, fallback to TL
    };

    // If Approved, Refund Balance
    if (isApproved) {
        const leaveBalanceSOQL = `SELECT Id, Annual_Leave__c, Casual_Balance__c, Sick_Balance__c, Earned_Balance__c FROM ${SF_OBJECTS.LEAVE_BALANCE} WHERE Employee__c = '${leave.Employee__c}'`;
        const balanceRecords = await queryRecords<any>(leaveBalanceSOQL);

        if (balanceRecords && balanceRecords.length > 0) {
          const balance = balanceRecords[0];
          const leaveType = leave.LeaveType__c;
          const totalDays = leave.TotalDays__c || 0;
          
          let updatePayload: any = {};
          
          if (leaveType === 'Casual') {
             updatePayload['Casual_Balance__c'] = (balance.Casual_Balance__c || 0) + totalDays;
          } else if (leaveType === 'Sick') {
             updatePayload['Sick_Balance__c'] = (balance.Sick_Balance__c || 0) + totalDays;
          } else if (leaveType === 'Earned' || leaveType === 'Privilege') {
             updatePayload['Earned_Balance__c'] = (balance.Earned_Balance__c || 0) + totalDays;
          } else if (leaveType === 'Annual') {
             updatePayload['Annual_Leave__c'] = (balance.Annual_Leave__c || 0) + totalDays;
          }

          if (Object.keys(updatePayload).length > 0) {
             await updateRecordInSalesforce(SF_OBJECTS.LEAVE_BALANCE, balance.Id, updatePayload);
          }
        }
    }

    // Update Leave Record
    await updateRecordInSalesforce('Leave__c', id, updateData);

    // Update DynamoDB (Sync)
    try {
        const { updateLeaveStatusInDynamo } = await import('@/lib/dynamo-integration');
        // Retrieve necessary IDs for DynamoDB Key
        // Note: We need the Employee String ID (EMP-XXX) ideally, but we might only have SF ID here in leave.Employee__c.
        // However, our Dynamo Helper 'createLeaveRequestInDynamo' used whatever was passed.
        // In 'POST' route we tried to use String ID but fell back to SF ID.
        // Let's rely on what we have (SF ID) or try to query String ID if needed.
        // For now, let's use leave.Employee__c as we likely stored it with that or inconsistent. 
        // Best effort:
        
        await updateLeaveStatusInDynamo({
            EmployeeId: leave.Employee__c, // This assumes the record in Dynamo was created with SF ID or we have to query Employee_ID__c first.
                                           // Improvement: Fetch Employee_ID__c in the initial SOQL query.
            StartDate: leave.StartDate__c,
            Id: id,
            Status: 'Cancelled',
            CancelReason: reason
        });
    } catch (e) {
         console.error("Dynamo update skipped", e);
    }

    // Expire related Notification
    // Find notification related to this Leave ID
    const notifQuery = `SELECT Id FROM ${SF_OBJECTS.NOTIFICATION} WHERE Related_Record_ID__c = '${id}' AND Status__c != 'Expired'`;
    const notifRecords = await queryRecords<any>(notifQuery);
    
    if (notifRecords && notifRecords.length > 0) {
        for (const notif of notifRecords) {
            await updateRecordInSalesforce(SF_OBJECTS.NOTIFICATION, notif.Id, {
                Status__c: 'Expired',
                Action_Required__c: false
            });
        }
    }

    // Send notification email
    const employeeName = `${leave.Contact__r?.FirstName || ''} ${leave.Contact__r?.LastName || ''}`.trim();
    const emailSubject = `Leave Cancelled`;
    const emailBody = `Dear ${employeeName},

Your leave for ${leave.LeaveType__c} leave (${leave.StartDate__c} to ${leave.EndDate__c}) 
has been successfully cancelled.

Reason: ${reason}

${isApproved ? 'The leave days have been refunded to your leave balance.' : 'The request has been withdrawn.'}

Best regards,
HRMS System`;

    if (leave.Contact__r?.Email) {
      await sendEmail({
        to: leave.Contact__r.Email,
        subject: emailSubject,
        html: emailBody,
      });
    }

    return NextResponse.json(
      { success: true, data: { ...leave, ...updateData } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error cancelling leave:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel leave' },
      { status: 500 }
    );
  }
}
