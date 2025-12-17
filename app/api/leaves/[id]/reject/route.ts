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
      updateData.CancelReasonTL__c = reason;
    } else {
      updateData.CancelReasonHR__c = reason;
    }

    // Update leave record
    await updateRecordInSalesforce('Leave__c', id, updateData);

    // Send notification email
    const employeeName = `${leave.Contact__r?.FirstName || ''} ${leave.Contact__r?.LastName || ''}`.trim();
    const emailSubject = `Leave Application Rejected`;
    const emailBody = `Dear ${employeeName},

Unfortunately, your leave application for ${leave.LeaveType__c} leave (${leave.StartDate__c} to ${leave.EndDate__c}) 
has been rejected by ${rejectionType === 'TL' ? 'Team Lead' : 'HR'}.

Reason: ${reason}

Please contact your ${rejectionType === 'TL' ? 'Team Lead' : 'HR'} for further discussion.

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
    console.error('Error rejecting leave:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reject leave' },
      { status: 500 }
    );
  }
}
