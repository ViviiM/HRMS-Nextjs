import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const conn = await getSalesforceConnection();
     
     // Need Employee Id
     let sfId = (session.user as any).sfId;
     if (!sfId) {
        const empRes = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
        sfId = empRes.records[0]?.Id;
     }

     if (!sfId) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

     // Fetch Balance
     // Assuming 1 record per employee per year? Or just one active record?
     // FRD says: Leave_Balance__c has fields Casual_Balance__c etc.
     // Let's simplified query for the latest balance record.
     const q = `
       SELECT Id, Casual_Balance__c, Sick_Balance__c, Earned_Balance__c, Unpaid_Balance__c
       FROM Leave_Balance__c
       WHERE Employee__c = '${sfId}'
       ORDER BY CreatedDate DESC
       LIMIT 1
     `;
     
     const result = await conn.query(q);
     
     if (result.totalSize === 0) {
        // Return defaults if no record found
        return NextResponse.json({ 
            success: true, 
            data: {
                Casual: 12,
                Sick: 10,
                Earned: 15,
                Unpaid: 0
            } 
        });
     }
     
     const rec = result.records[0];
     
     return NextResponse.json({ 
        success: true, 
        data: {
            Casual: rec.Casual_Balance__c || 0,
            Sick: rec.Sick_Balance__c || 0,
            Earned: rec.Earned_Balance__c || 0,
            Unpaid: rec.Unpaid_Balance__c || 0
        }
     });

  } catch (error: any) {
    console.error("Leave Balance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
