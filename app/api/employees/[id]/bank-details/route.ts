import { NextRequest, NextResponse } from 'next/server';
import { queryRecords, createRecordInSalesforce, updateRecordInSalesforce, SF_OBJECTS, escapeSOQL } from '@/lib/salesforce';
import { BankDetailsSchema } from '@/lib/validation';
import { encrypt, decrypt } from '@/lib/crypto';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: employeeId } = await params;
    const soql = `SELECT Id, Bank_Name__c, Bank_Branch_Name__c, Bank_Account_Number__c, IFSC__c, Primary_Account__c FROM ${SF_OBJECTS.BANK_DETAILS} WHERE Employee__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
    const records = await queryRecords<any>(soql);
    if (!records || records.length === 0) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    const rec = records[0];
    // Decrypt account number if encrypted
    let accountNumber = rec.Bank_Account_Number__c;
    try {
      accountNumber = accountNumber && accountNumber.startsWith('AQ==') === false ? decrypt(accountNumber) : accountNumber;
    } catch (err) {
      // If decrypt fails, keep raw value
    }

    const masked = accountNumber ? `****${String(accountNumber).slice(-4)}` : null;

    return NextResponse.json({ success: true, data: {
      Id: rec.Id,
      Bank_Name__c: rec.Bank_Name__c,
      Bank_Branch_Name__c: rec.Bank_Branch_Name__c,
      Bank_Account_Masked: masked,
      IFSC__c: rec.IFSC__c,
      Primary_Account__c: rec.Primary_Account__c,
    } }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching bank details:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch bank details' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: employeeId } = await params;
    const body = await request.json();
    const parsed = BankDetailsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors.map(e => e.message).join(', ') }, { status: 400 });
    }

    const payload = parsed.data;
    // Encrypt account number
    const encryptedAccount = encrypt(payload.Bank_Account_Number__c);

    // Check existing
    const soql = `SELECT Id FROM ${SF_OBJECTS.BANK_DETAILS} WHERE Employee__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
    const records = await queryRecords<any>(soql);

    if (records && records.length > 0) {
      const idToUpdate = records[0].Id;
      await updateRecordInSalesforce(SF_OBJECTS.BANK_DETAILS, idToUpdate, {
        Bank_Name__c: payload.Bank_Name__c,
        Bank_Branch_Name__c: payload.Bank_Branch_Name__c,
        Bank_Account_Number__c: encryptedAccount,
        IFSC__c: payload.IFSC__c,
        Primary_Account__c: payload.Primary_Account__c ?? true,
      });

      return NextResponse.json({ success: true, data: { Id: idToUpdate } }, { status: 200 });
    }

    // Create new
    const recordData = {
      Employee__c: employeeId,
      Bank_Name__c: payload.Bank_Name__c,
      Bank_Branch_Name__c: payload.Bank_Branch_Name__c,
      Bank_Account_Number__c: encryptedAccount,
      IFSC__c: payload.IFSC__c,
      Primary_Account__c: payload.Primary_Account__c ?? true,
    };

    const res = await createRecordInSalesforce(SF_OBJECTS.BANK_DETAILS, recordData);
    return NextResponse.json({ success: true, data: { Id: res?.id || res } }, { status: 201 });
  } catch (error: any) {
    console.error('Error updating bank details:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update bank details' }, { status: 500 });
  }
}
