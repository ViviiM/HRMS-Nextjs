import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const conn = await getSalesforceConnection();
     
     // 1. Get Employee ID (SF ID)
     let sfId = (session.user as any).sfId;
     if (!sfId) {
        const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
        sfId = emp.records[0]?.Id;
     }
     
     if(!sfId) return NextResponse.json({ data: null });

     // 2. Fetch Bank Details
     const q = `
       SELECT Id, Bank_Name__c, Account_Number__c, IFSC_Code__c, Account_Holder_Name__c, Pan_Number__c
       FROM Bank_Details__c
       WHERE Employee__c = '${sfId}'
       LIMIT 1
     `;
     
     const result = await conn.query(q);
     
     if (result.totalSize === 0) return NextResponse.json({ success: true, data: null });
     
     return NextResponse.json({ success: true, data: result.records[0] });

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
        const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
        sfId = emp.records[0]?.Id;
     }

     // Upsert logic: Check if exists, update; else create.
     // For simplicity, query first.
     const check = await conn.query(`SELECT Id FROM Bank_Details__c WHERE Employee__c = '${sfId}' LIMIT 1`);
     
     const record = {
         Employee__c: sfId,
         Bank_Name__c: data.bankName,
         Account_Number__c: data.accountNumber,
         IFSC_Code__c: data.ifsc,
         Account_Holder_Name__c: data.holderName,
         Pan_Number__c: data.pan
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
