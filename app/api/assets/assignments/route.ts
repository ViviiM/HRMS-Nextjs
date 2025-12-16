import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords, createRecordInSalesforce, updateRecordInSalesforce, escapeSOQL } from '@/lib/salesforce';
import { ApiResponse, AssetAssignment } from '@/types';

// GET - Fetch asset assignments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const employeeId = searchParams.get('employeeId');

    const conn = getSalesforceConnection();

    const conditions: string[] = [];
    if (assetId) conditions.push(`Asset__c = '${escapeSOQL(assetId)}'`);
    if (employeeId) conditions.push(`Employee__c = '${escapeSOQL(employeeId)}'`);
    if (!assetId && !employeeId) conditions.push(`Status__c = 'Active'`);

    const soql = `SELECT Id, Asset__r.Name, Employee__c, AssignmentDate__c, 
                         Condition__c, Status__c, ReturnDate__c, FinalCondition__c
                  FROM AssetAssignment__c 
                  WHERE ${conditions.join(' AND ')}
                  ORDER BY AssignmentDate__c DESC`;

    const records = await queryRecords<AssetAssignment>(soql);

    return NextResponse.json(
      { success: true, data: records || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST - Create asset assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { Asset__c, EmployeeId__c, AssignmentDate__c, Condition__c } = body;

    // Validation
    if (!Asset__c || !EmployeeId__c || !AssignmentDate__c) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: Asset__c, EmployeeId__c, AssignmentDate__c' },
        { status: 400 }
      );
    }

    const conn = getSalesforceConnection();

    // Verify asset exists and is available
    const assetSOQL = `SELECT Id, Status__c FROM Asset__c WHERE Id = '${Asset__c}'`;
    const assetRecords = await queryRecords<any>(assetSOQL);
    if (!assetRecords || assetRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Asset not found' },
        { status: 404 }
      );
    }

    const asset = assetRecords[0];
    if (asset.Status__c !== 'Active') {
      return NextResponse.json(
        { success: false, error: 'Asset is not available for assignment' },
        { status: 400 }
      );
    }

    // Create assignment record
    const assignmentData = {
      Asset__c,
      Employee__c: escapeSOQL(EmployeeId__c),
      AssignmentDate__c,
      Condition__c: Condition__c || 'New',
      Status__c: 'Active',
    };

    const recordId = await createRecordInSalesforce('AssetAssignment__c', assignmentData);

    // Update asset status to Assigned
    await updateRecordInSalesforce('Asset__c', Asset__c, {
      Status__c: 'Assigned',
    });

    return NextResponse.json(
      { success: true, data: { Id: recordId, ...assignmentData } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
