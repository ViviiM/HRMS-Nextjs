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
    const { approvalType } = body; // 'TL' or 'HR'

    if (!approvalType || !['TL', 'HR'].includes(approvalType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid approval type. Must be TL or HR' },
        { status: 400 }
      );
    }

    const conn = getSalesforceConnection();

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

      // Update Leave Balance - deduct leave days
      const leaveBalanceSOQL = `SELECT Id FROM LeaveBalance__c WHERE Employee__c = '${leave.Employee__c}'`;
      const balanceRecords = await queryRecords<any>(leaveBalanceSOQL);

      if (balanceRecords && balanceRecords.length > 0) {
        const leaveType = (leave.LeaveType__c as string)?.replace(/\s+/g, '_');
        const balanceField = leaveType === 'Annual' ? 'Annual_Leave__c' : 
                            leaveType === 'Casual' ? 'Casual_Leave__c' :
                            leaveType === 'Sick' ? 'Sick_Leave__c' : 'Earned_Leave__c';

        await updateRecordInSalesforce('LeaveBalance__c', balanceRecords[0].Id, {
          [balanceField]: `${balanceField} - ${leave.TotalDays__c}`
        });
      }
    }

    // Update leave record
    await updateRecordInSalesforce('Leave__c', id, updateData);

    // Send notification email
    const employeeName = `${leave.Contact__r?.FirstName || ''} ${leave.Contact__r?.LastName || ''}`.trim();
    const emailSubject = `Leave ${approvalType === 'TL' ? 'Team Lead' : 'HR'} Approval`;
    const emailBody = `Dear ${employeeName},

Your leave application for ${leave.LeaveType__c} leave (${leave.StartDate__c} to ${leave.EndDate__c}) 
has been approved by ${approvalType === 'TL' ? 'Team Lead' : 'HR'}.

${tlApproved && hrApproved ? 'Your leave has been fully approved.' : 'Awaiting final approval.'}

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
    console.error('Error approving leave:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve leave' },
      { status: 500 }
    );
  }
}
