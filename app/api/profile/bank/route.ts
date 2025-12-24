import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";

//Modified by Sibten on 24-06-2024 to add Primary_Account__c filter
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const conn = await getSalesforceConnection();

    // 1. Get Employee ID (SF ID)
    let sfId = (session.user as any).sfId;
    if (!sfId) {
      const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Contact__r.Email = '${session.user.email}' LIMIT 1`);
      sfId = emp.records[0]?.Id;
    }

    // 2. Fetch Bank Details
    const q = `
       SELECT Id, Name, Bank_Account_Number__c, IFSC__c,Bank_Branch_Name__c, Pan_Number__c
       FROM Bank_Details__c
       WHERE Employee__c = '${sfId}' AND Primary_Account__c = true
       LIMIT 1
     `;
    const result = await conn.query(q);
    console.log("Bank Details Fetch Result:", result);
    if (result.totalSize === 0) return NextResponse.json({ success: true, data: null });

    return NextResponse.json({ success: true, data: result.records[0] });

  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


// Modified by Sibten on 24-06-2024 to add upsert logic and Primary_Account__c field
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();
    const conn = await getSalesforceConnection();

    let sfId = (session.user as any).sfId;
    if (!sfId) {
      const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Contact__r.Email = '${session.user.email}' LIMIT 1`);
      sfId = emp.records[0]?.Id;
    }
    // Upsert logic: Check if exists, update; else create.
    // For simplicity, query first.
    const check = await conn.query(`SELECT Id FROM Bank_Details__c WHERE Employee__c = '${sfId}' AND Primary_Account__c = true LIMIT 1`);
    console.log("Bank Details Upsert Check:", check);
    const record = {
      Employee__c: sfId,
      Name: data.bankName,
      Bank_Account_Number__c: data.accountNumber,
      IFSC__c: data.ifsc,
      Bank_Branch_Name__c: data.holderName,
      Pan_Number__c: data.pan,
      Primary_Account__c: true
    };

    if (check.totalSize > 0) {
      // Update
      await conn.sobject('Bank_Details__c').update({
        Id: check.records[0].Id,
        ...record
      });
    } else {
      // Create
      await conn.sobject('Bank_Details__c').create(record);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const conn = await getSalesforceConnection();

        let sfId = (session.user as any).sfId;
        if (!sfId) {
            const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Contact__r.Email = '${session.user.email}' LIMIT 1`);
            sfId = emp.records[0]?.Id;
        }

        const record = {
            Employee__c: sfId,
            Name: data.bankName || '',
            Bank_Account_Number__c: data.accountNumber || '',
            IFSC__c: data.ifsc || '',
            Bank_Branch_Name__c: data.holderName || '',
            Pan_Number__c: data.pan || '',
            Primary_Account__c: data.primaryAccount || false
        };

        // Create
        await conn.sobject('Bank_Details__c').create(record);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}