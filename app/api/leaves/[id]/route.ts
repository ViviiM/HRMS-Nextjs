import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords, updateRecordInSalesforce, buildSOQLQuery, escapeSOQL } from '@/lib/salesforce';
import { sendEmail } from '@/lib/email';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conn = getSalesforceConnection();

    // Fetch leave record with all details
    const soql = `SELECT Id, Employee__c, Contact__r.FirstName, Contact__r.LastName, LeaveType__c, 
                         StartDate__c, EndDate__c, TotalDays__c, Status__c, Reason__c, 
                         TL_Approval__c, HR_Approval__c, CreatedDate FROM Leave__c WHERE Id = '${id}'`;

    const records = await queryRecords(soql);
    if (!records || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: records[0] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching leave:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch leave' },
      { status: 500 }
    );
  }
}
