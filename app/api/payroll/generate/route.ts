import { NextRequest, NextResponse } from 'next/server';
import { PayrollGenerateSchema } from '@/lib/validation';
import { queryRecords, createRecordInSalesforce, SF_OBJECTS, escapeSOQL } from '@/lib/salesforce';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PayrollGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors.map(e => e.message).join(', ') }, { status: 400 });
    }

    const { payrollMonth, employeeIds } = parsed.data;
    // Basic payrollMonth format YYYY-MM
    const year = Number(payrollMonth.split('-')[0]);

    // Fetch employee salary info from Employee__c
    const idsList = employeeIds.map(id => `'${escapeSOQL(id)}'`).join(',');
    const empSOQL = `SELECT Id, Base_Salary__c FROM Employee__c WHERE Id IN (${idsList})`;
    const employees = await queryRecords<any>(empSOQL);

    const created: any[] = [];
    for (const emp of employees) {
      const basic = Number(emp.Base_Salary__c || 0);
      const bonus = 0;
      const net = basic + bonus; // simple calculation; real logic should apply taxes/deductions

      const payrollRec = {
        Employee__c: emp.Id,
        Payroll_Month__c: payrollMonth,
        Payroll_Year__c: year,
        Basic_Salary__c: basic,
        Bonus__c: bonus,
        Net_Salary__c: net,
        Status__c: 'Generated',
      };

      const res = await createRecordInSalesforce(SF_OBJECTS.PAYROLL, payrollRec);
      created.push({ Id: res?.id || res, ...payrollRec });
    }

    // Create Payroll Summary
    const summaryRec = {
      Period_Type__c: 'Monthly',
      Payroll_Month__c: payrollMonth,
      Payroll_Year__c: year,
      Total_Employees__c: created.length,
      Total_Basic__c: created.reduce((s, p) => s + (p.Basic_Salary__c || 0), 0),
      Total_Bonus__c: created.reduce((s, p) => s + (p.Bonus__c || 0), 0),
      Net_Total_Salary__c: created.reduce((s, p) => s + (p.Net_Salary__c || 0), 0),
      Generated_Date__c: new Date().toISOString(),
      Generated_By__c: 'System',
    };

    await createRecordInSalesforce(SF_OBJECTS.PAYROLL_SUMMARY, summaryRec);

    return NextResponse.json({ success: true, data: { payrolls: created, summary: summaryRec } }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating payroll:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate payroll' }, { status: 500 });
  }
}
