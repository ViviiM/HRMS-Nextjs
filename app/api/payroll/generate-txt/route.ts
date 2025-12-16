import { NextRequest, NextResponse } from 'next/server';
import { queryRecords } from '@/lib/salesforce';
import { decrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year } = body;
    if (!month || !year) return NextResponse.json({ success: false, error: 'month and year required' }, { status: 400 });

    // Fetch generated payrolls for month/year
    const soql = `SELECT Id, Employee__c, Net_Salary__c FROM Payroll__c WHERE Payroll_Month__c = '${month}' AND Payroll_Year__c = ${Number(year)} AND Status__c = 'Generated'`;
    const payrolls = await queryRecords<any>(soql);

    // For each payroll fetch bank details
    const lines: string[] = [];
    for (const p of payrolls) {
      const empId = p.Employee__c;
      const bankSoql = `SELECT Bank_Account_Number__c, IFSC__c, Bank_Name__c FROM Bank_Details__c WHERE Employee__c = '${empId}' LIMIT 1`;
      const bank = (await queryRecords<any>(bankSoql))[0];
      let account = bank?.Bank_Account_Number__c;
      try {
        if (account) account = decrypt(account);
      } catch (e) {
        // leave as-is
      }

      // Simple CSV-like NEFT: EmployeeId,AccountNo,IFSC,Amount
      const amount = Number(p.Net_Salary__c || 0).toFixed(2);
      lines.push(`${empId},${account || ''},${bank?.IFSC__c || ''},${amount}`);
    }

    const content = lines.join('\n');
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename=payroll_${month}_${year}.txt`,
      },
    });
  } catch (error: any) {
    console.error('Error generating bank file:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate bank file' }, { status: 500 });
  }
}
