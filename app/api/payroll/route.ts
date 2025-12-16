import { NextRequest, NextResponse } from 'next/server';
import { queryRecords, createRecordInSalesforce, SF_OBJECTS, escapeSOQL } from '@/lib/salesforce';
import { Payroll } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const conditions: string[] = [];
    if (month) conditions.push(`Payroll_Month__c = '${escapeSOQL(month)}'`);
    if (year) conditions.push(`Payroll_Year__c = ${Number(year)}`);
    if (status) conditions.push(`Status__c = '${escapeSOQL(status)}'`);
    if (employeeId) conditions.push(`Employee__c = '${escapeSOQL(employeeId)}'`);

    const countSOQL = `SELECT COUNT() FROM ${SF_OBJECTS.PAYROLL} ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`;
    const countResult = await queryRecords<any>(countSOQL);
    const total = countResult && countResult.length > 0 ? countResult[0].totalSize : 0;

    const offset = (page - 1) * pageSize;
    const fields = ['Id','Employee__c','Payroll_Month__c','Payroll_Year__c','Basic_Salary__c','Bonus__c','Net_Salary__c','Status__c','Payslip_URL__c','CreatedDate'];
    const dataSOQL = `SELECT ${fields.join(', ')} FROM ${SF_OBJECTS.PAYROLL} ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY CreatedDate DESC LIMIT ${pageSize} OFFSET ${offset}`;

    const records = await queryRecords<Payroll>(dataSOQL);

    return NextResponse.json({ success: true, data: records || [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching payrolls:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch payrolls' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Not used; payroll generation is implemented in /generate route
  return NextResponse.json({ success: false, error: 'Use /api/payroll/generate to create payrolls' }, { status: 400 });
}
