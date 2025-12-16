import { NextRequest, NextResponse } from 'next/server';
import { querySingleRecord, SF_OBJECTS } from '@/lib/salesforce';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const soql = `SELECT Id, Employee__c, Payroll_Month__c, Payroll_Year__c, Basic_Salary__c, Bonus__c, Net_Salary__c, Status__c, Payslip_URL__c FROM ${SF_OBJECTS.PAYROLL} WHERE Id = '${id}'`;
    const rec = await querySingleRecord<any>(soql);
    if (!rec) return NextResponse.json({ success: false, error: 'Payroll not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: rec }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching payroll:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch payroll' }, { status: 500 });
  }
}
