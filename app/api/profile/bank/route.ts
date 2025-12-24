import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";
import { getBankDetailsFromDynamo, updateBankDetailsInDynamo } from "@/lib/dynamo-integration";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeId = (session.user as any).employeeId;

  try {
     // 1. Try DynamoDB First (Cache)
     if (employeeId) {
         const cached = await getBankDetailsFromDynamo(employeeId);
         if (cached) {
            console.log("Bank Details: Cache Hit");
            // Map Dynamo keys to Frontend Keys
            // Our Schema in Dynamo: Name, Bank_Account_Number__c, etc. matches what we store.
            return NextResponse.json({ success: true, data: cached });
         }
     }
     
     // 2. Fetch from Salesforce (Fallback)
     const conn = await getSalesforceConnection();
     let sfId = (session.user as any).sfId;
     if (!sfId) {
        const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Contact__r.Email = '${session.user.email}' LIMIT 1`);
        sfId = emp.records[0]?.Id;
     }
     
     const q = `
       SELECT Id, Name, Bank_Account_Number__c, IFSC__c,Bank_Branch_Name__c, Pan_Number__c
       FROM Bank_Details__c
       WHERE Employee__c = '${sfId}' AND Primary_Account__c = true
       LIMIT 1
     `;
     const result = await conn.query(q);
     
     if (result.totalSize === 0) return NextResponse.json({ success: true, data: null });
     
     const sfData = result.records[0];
     
     // Optional: Backfill Dynamo? 
     // For now, adhering to read-through behavior.
     
     return NextResponse.json({ success: true, data: sfData });

  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeId = (session.user as any).employeeId;

  try {
     const data = await req.json();
     
     // Data Mapping
     const record = {
      Name: data.bankName,
      Bank_Account_Number__c: data.accountNumber,
      IFSC__c: data.ifsc,
      Bank_Branch_Name__c: data.holderName,
      Pan_Number__c: data.pan,
      Primary_Account__c: true
    };

     // 1. Update Salesforce (Master)
     const conn = await getSalesforceConnection();
     let sfId = (session.user as any).sfId;
     if (!sfId) {
        const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Contact__r.Email = '${session.user.email}' LIMIT 1`);
        sfId = emp.records[0]?.Id;
     }

     const check = await conn.query(`SELECT Id FROM Bank_Details__c WHERE Employee__c = '${sfId}' AND Primary_Account__c = true LIMIT 1`);
     
     const sfRecord = { ...record, Employee__c: sfId };

     if (check.totalSize > 0) {
         await conn.sobject('Bank_Details__c').update({
             Id: check.records[0].Id,
             ...sfRecord
         });
     } else {
         await conn.sobject('Bank_Details__c').create(sfRecord);
     }

     // 2. Update DynamoDB (Cache/Dual Write)
     if (employeeId) {
         await updateBankDetailsInDynamo(employeeId, record);
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