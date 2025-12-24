import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords, SF_OBJECTS, escapeSOQL } from '@/lib/salesforce';
import { LeaveBalance } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const conn = await getSalesforceConnection(); // Needs await for proper connection if I use query directly later, though queryRecords handles it. But for ID resolution I need conn.

    let targetEmployeeId = employeeId;
    if (employeeId.startsWith('EMP-')) {
       // We can use conn.query directly or queryRecords. 
       // conn from getSalesforceConnection() returns a promise? No, looking at lib/salesforce.ts it returns conn but getSalesforceConnection is async... wait.
       // The original code in this file had `const conn = getSalesforceConnection();` WITHOUT await at line 11!
       // Checking lib/salesforce.ts view from Step 3: `export const getSalesforceConnection = async () => { ... }`.
       // So the original code was probably missing await or relying on cached connection being synchronous?
       // Wait, line 11 says `const conn = getSalesforceConnection();` in original file. The tool output shows line 11.
       // If getSalesforceConnection is async, line 11 `conn` is a Promise.
       // But line 18 uses `queryRecords(soql)` which handles connection internally via `getSalesforceConnection()`.
       // So line 11 was actually unused or incorrect but harmless if not used?
       // Actually line 11 IS unused in the original code! `conn` var is created but `queryRecords` is imported and used.
       
       // I will ignore the unused variable `conn` or fix it. I need a connection to run my employee query.
       // So I will call `await getSalesforceConnection()`.
       
       const empQuery = `SELECT Id FROM ${SF_OBJECTS.EMPLOYEE} WHERE Employee_ID__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
       const empRecords = await queryRecords<any>(empQuery);
       if (empRecords.length > 0) {
           targetEmployeeId = empRecords[0].Id;
       }
    }

    // Fetch leave balance for employee
    const soql = `SELECT Id, Employee__c, Annual_Leave__c, Casual_Balance__c, 
                         Sick_Balance__c, Earned_Balance__c, Unpaid_Balance__c, Last_Reset_Date__c
                  FROM Leave_Balance__c WHERE Employee__c = '${escapeSOQL(targetEmployeeId)}'`; // Ensure Object Name is Leave_Balance__c

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
