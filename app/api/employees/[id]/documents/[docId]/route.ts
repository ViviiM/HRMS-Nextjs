import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { querySingleRecord, updateRecordInSalesforce, escapeSOQL, SF_OBJECTS } from '@/lib/salesforce';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { docId, id: employeeId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    const sfId = (session.user as any).sfId;
    if (role === 'Employee' && sfId !== employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const soql = `SELECT Id, Document_Type__c, Document_category__c, File_ID__c, File_URL__c, Status__c, CreatedDate, Name FROM ${SF_OBJECTS.DOCUMENT} WHERE Employee__c = '${escapeSOQL(employeeId)}' AND Id='${escapeSOQL(docId)}' LIMIT 1`;
    const records = await querySingleRecord<any>(soql);
    const doc = records && records.length ? records[0] : null;

    if (!doc) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: doc }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch document' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { docId, id: employeeId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    const sfId = (session.user as any).sfId;
    if (role === 'Employee' && sfId !== employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete in Salesforce - mark status as Deleted
    await updateRecordInSalesforce(SF_OBJECTS.DOCUMENT, docId, { Status__c: 'Deleted' });

    return NextResponse.json({ success: true, data: { Id: docId, Status__c: 'Deleted' } }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete document' }, { status: 500 });
  }
}
