import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const conn = await getSalesforceConnection();
     let sfId = (session.user as any).sfId;
     if (!sfId) {
         const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
         sfId = emp.records[0]?.Id;
     }

     const q = `
       SELECT Id, Name, Template_ID__c, Sign_Date__c, Expiry_Date__c, Status__c, Document_URL__c
       FROM NDA__c
       WHERE Employee__c = '${sfId}'
     `;
     const result = await conn.query(q);
     
     const ndas = result.records.map((r: any) => ({
         id: r.Id,
         employeeId: sfId,
         employeeName: session.user?.name,
         templateId: r.Template_ID__c,
         signDate: r.Sign_Date__c,
         expiryDate: r.Expiry_Date__c,
         status: r.Status__c?.toLowerCase() || 'pending',
         documentUrl: r.Document_URL__c
     }));

     return NextResponse.json({ success: true, data: ndas });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
