import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { uploadToS3 } from '@/lib/s3';
import { createRecordInSalesforce, queryRecords, escapeSOQL, SF_OBJECTS, DOCUMENT_STATUS } from '@/lib/salesforce';
import { DocumentUploadSchema } from '@/lib/validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: employeeId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    const sfId = (session.user as any).sfId;
    if (role === 'Employee' && sfId !== employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    let targetEmployeeId = employeeId;
    if (employeeId.startsWith('EMP-')) {
       // Resolve Salesforce ID from External ID
       const { getSalesforceConnection } = await import('@/lib/salesforce');
       const conn = await getSalesforceConnection();
       const empQuery = `SELECT Id FROM ${SF_OBJECTS.EMPLOYEE} WHERE Employee_ID__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
       const empResult = await conn.query(empQuery);
       if (empResult.totalSize > 0) {
           targetEmployeeId = empResult.records[0].Id;
       } else {
           // If not found, technically we should 404, but let it fail or return empty downstream
           console.warn(`Employee not found for External ID: ${employeeId}`);
       }
    }

    const soql = `SELECT Id, Document_Type__c, Document_category__c, File_ID__c, File_URL__c, Status__c, CreatedDate, Name FROM ${SF_OBJECTS.DOCUMENT} WHERE Employee__c = '${escapeSOQL(targetEmployeeId)}' ORDER BY CreatedDate DESC`;
    const records = await queryRecords<any>(soql);

    return NextResponse.json({ success: true, data: records || [] }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: employeeId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    const sfId = (session.user as any).sfId;
    if (role === 'Employee' && sfId !== employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = DocumentUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors.map(e => e.message).join(', ') }, { status: 400 });
    }
    const { fileBase64, fileName, contentType, documentType, category } = parsed.data;

    // Decode base64
    const buffer = Buffer.from(fileBase64, 'base64');
    // Upload to S3
    const { url: fileUrl, key } = await uploadToS3(buffer, fileName, 'documents', contentType);

    let targetEmployeeId = employeeId;
    if (employeeId.startsWith('EMP-')) {
       // Resolve Salesforce ID from External ID
       const { getSalesforceConnection } = await import('@/lib/salesforce');
       const conn = await getSalesforceConnection();
       const empQuery = `SELECT Id FROM ${SF_OBJECTS.EMPLOYEE} WHERE Employee_ID__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
       const empResult = await conn.query(empQuery);
       if (empResult.totalSize > 0) {
           targetEmployeeId = empResult.records[0].Id;
       }
    }

    // Create Salesforce Document record
    const documentRecord = {
      Employee__c: targetEmployeeId,
      Document_Type__c: documentType || 'Personal Documents',
      Document_category__c: category || 'Other',
      File_ID__c: key,
      File_URL__c: fileUrl,
      Status__c: DOCUMENT_STATUS.UPLOADED,
      Name: fileName,
    };

    const result = await createRecordInSalesforce(SF_OBJECTS.DOCUMENT, documentRecord);

    return NextResponse.json({ success: true, data: { id: result?.id || result, ...documentRecord } }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to upload document' }, { status: 500 });
  }
}
