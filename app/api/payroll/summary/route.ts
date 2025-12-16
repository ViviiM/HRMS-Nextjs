import { NextRequest, NextResponse } from 'next/server';
import { queryRecords, escapeSOQL } from '@/lib/salesforce';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    if (!month || !year) return NextResponse.json({ success: false, error: 'month and year required' }, { status: 400 });

    const soql = `SELECT Id, Basic_Salary__c, Bonus__c, Net_Salary__c FROM Payroll__c WHERE Payroll_Month__c = '${escapeSOQL(month)}' AND Payroll_Year__c = ${Number(year)}`;
    const records = await queryRecords<any>(soql);

    const totalEmployees = records.length;
    const totalBasic = records.reduce((s, r) => s + Number(r.Basic_Salary__c || 0), 0);
    const totalBonus = records.reduce((s, r) => s + Number(r.Bonus__c || 0), 0);
    const totalNet = records.reduce((s, r) => s + Number(r.Net_Salary__c || 0), 0);

    return NextResponse.json({ success: true, data: { totalEmployees, totalBasic, totalBonus, totalNet, month, year } }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching payroll summary:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch payroll summary' }, { status: 500 });
  }
}
