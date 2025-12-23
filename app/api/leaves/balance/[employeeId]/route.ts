import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords } from '@/lib/salesforce';
import { LeaveBalance } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const conn = getSalesforceConnection();

    // Fetch leave balance for employee
    const soql = `SELECT Id, Employee__c, Annual_Leave__c, Casual_Balance__c, 
                         Sick_Balance__c, Earned_Balance__c, Unpaid_Balance__c, Last_Reset_Date__c
                  FROM Leave_Balance__c WHERE Employee__c = '${employeeId}'`; // Ensure Object Name is Leave_Balance__c

    const records = await queryRecords<any>(soql);
    if (!records || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave balance not found' },
        { status: 404 }
      );
    }

    const balance = records[0];
    // Provide both canonical and UI-friendly property names
    const formattedBalance: LeaveBalance = {
      Id: balance.Id,
      EmployeeId: balance.Employee__c,
      AnnualLeave: balance.Annual_Leave__c || 0,
      CasualBalance: balance.Casual_Balance__c || 0,
      SickBalance: balance.Sick_Balance__c || 0,
      EarnedBalance: balance.Earned_Balance__c || 0,
      UnpaidBalance: balance.Unpaid_Balance__c || 0,
      LastResetDate: balance.Last_Reset_Date__c,

      // UI aliases
      id: balance.Id,
      employeeId: balance.Employee__c,
      Annual: balance.Annual_Leave__c || 0,
      CasualLeave: balance.Casual_Balance__c || 0,
      SickLeave: balance.Sick_Balance__c || 0,
      EarnedLeave: balance.Earned_Balance__c || 0,
      unpaidBalance: balance.Unpaid_Balance__c || 0,
      LastUpdatedDate: balance.Last_Reset_Date__c,
      Year: balance.Year__c || new Date().getFullYear().toString(),
    };

    return NextResponse.json(
      { success: true, data: formattedBalance },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching leave balance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch leave balance' },
      { status: 500 }
    );
  }
}
