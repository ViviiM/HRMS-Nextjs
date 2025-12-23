import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const { id: employeeId } = await params;
     const conn = await getSalesforceConnection();
     
     // Fetch Bank Details for the specific employee
     const q = `
       SELECT Id, Name, Bank_Account_Number__c, IFSC__c, Bank_Branch_Name__c, Pan_Number__c
       FROM Bank_Details__c
       WHERE Employee__c = '${employeeId}'
       LIMIT 1
     `;
     const result = await conn.query(q);
     
     if (result.totalSize === 0) return NextResponse.json({ success: true, data: null });
     
     return NextResponse.json({ success: true, data: result.records[0] });

  } catch (error: any) {
    console.error("Bank Details Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
