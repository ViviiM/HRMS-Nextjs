import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceConnection, queryRecords, createRecordInSalesforce, buildSOQLQuery, escapeSOQL } from '@/lib/salesforce';
import { PaginatedResponse, Asset } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const conn = getSalesforceConnection();

    // Build conditions
    const conditions: string[] = [];
    if (category) conditions.push(`Category__c = '${escapeSOQL(category)}'`);
    if (status) conditions.push(`Status__c = '${escapeSOQL(status)}'`);
    if (search) {
      const searchTerm = escapeSOQL(search);
      conditions.push(`(Name LIKE '%${searchTerm}%' OR SerialNumber__c LIKE '%${searchTerm}%')`);
    }

    // Get total count
    const countSOQL = `SELECT COUNT() FROM Asset__c ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`;
    const countResult = await queryRecords<any>(countSOQL);
    const total = countResult && countResult.length > 0 ? countResult[0].totalSize : 0;

    // Get paginated data
    const offset = (page - 1) * pageSize;
    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const dataSOQL = `SELECT Id, Name, Category__c, SerialNumber__c, PurchaseDate__c, Cost__c, Supplier__c, Status__c, CreatedDate FROM Asset__c${whereClause} ORDER BY CreatedDate DESC LIMIT ${pageSize} OFFSET ${offset}`;

    const records = await queryRecords<Asset>(dataSOQL);

    const response: PaginatedResponse<Asset> = {
      success: true,
      data: records || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { Name, Category__c, SerialNumber__c, PurchaseDate__c, Cost__c, Supplier__c, Warranty_Months__c } = body;

    // Validation
    if (!Name || !Category__c || !SerialNumber__c || !PurchaseDate__c || !Cost__c) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: Name, Category, SerialNumber, PurchaseDate, Cost' },
        { status: 400 }
      );
    }

    const conn = getSalesforceConnection();

    // Create asset record
    const assetData = {
      Name: escapeSOQL(Name),
      Category__c: escapeSOQL(Category__c),
      SerialNumber__c: escapeSOQL(SerialNumber__c),
      PurchaseDate__c,
      Cost__c,
      Supplier__c: Supplier__c ? escapeSOQL(Supplier__c) : undefined,
      Warranty_Months__c,
      Status__c: 'Active',
    };

    const recordId = await createRecordInSalesforce('Asset__c', assetData);

    return NextResponse.json(
      { success: true, data: { Id: recordId, ...assetData } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating asset:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create asset' },
      { status: 500 }
    );
  }
}
