import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords, updateRecordInSalesforce } from '@/lib/salesforce';
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

    const conn = getSalesforceConnection();

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

    // Only allow cancellation if leave is approved
    if (leave.Status__c !== 'Approved') {
      return NextResponse.json(
        { success: false, error: 'Only approved leaves can be cancelled' },
        { status: 400 }
      );
    }

    // Refund leave balance
    const leaveBalanceSOQL = `SELECT Id FROM LeaveBalance__c WHERE Employee__c = '${leave.Employee__c}'`;
    const balanceRecords = await queryRecords<any>(leaveBalanceSOQL);

    if (balanceRecords && balanceRecords.length > 0) {
      const leaveType = (leave.LeaveType__c as string)?.replace(/\s+/g, '_');
      const balanceField = leaveType === 'Annual' ? 'Annual_Leave__c' : 
                          leaveType === 'Casual' ? 'Casual_Leave__c' :
                          leaveType === 'Sick' ? 'Sick_Leave__c' : 'Earned_Leave__c';

      await updateRecordInSalesforce('LeaveBalance__c', balanceRecords[0].Id, {
        [balanceField]: `${balanceField} + ${leave.TotalDays__c}`
      });
    }

    // Update leave record
    await updateRecordInSalesforce('Leave__c', id, {
      Status__c: 'Cancelled',
      CancelReasonTL__c: reason,
    });

    // Send notification email
    const employeeName = `${leave.Contact__r?.FirstName || ''} ${leave.Contact__r?.LastName || ''}`.trim();
    const emailSubject = `Leave Cancelled`;
    const emailBody = `Dear ${employeeName},

Your leave for ${leave.LeaveType__c} leave (${leave.StartDate__c} to ${leave.EndDate__c}) 
has been successfully cancelled.

Reason: ${reason}

The leave days have been refunded to your leave balance.

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
      { success: true, data: { ...leave, Status__c: 'Cancelled' } },
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
