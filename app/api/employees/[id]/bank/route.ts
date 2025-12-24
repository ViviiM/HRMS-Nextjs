import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS, escapeSOQL } from "@/lib/salesforce";

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const { id: employeeId } = await params;
     const conn = await getSalesforceConnection();
     
     let targetEmployeeId = employeeId;
     if (employeeId.startsWith('EMP-')) {
          const empQuery = `SELECT Id FROM ${SF_OBJECTS.EMPLOYEE} WHERE Employee_ID__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
          const empResult = await conn.query(empQuery);
          if (empResult.totalSize > 0) {
              targetEmployeeId = empResult.records[0].Id;
          }
     }

     // Fetch Bank Details for the specific employee
     const q = `
       SELECT Id, Name, Bank_Account_Number__c, IFSC__c, Bank_Branch_Name__c, Pan_Number__c
       FROM Bank_Details__c
       WHERE Employee__c = '${targetEmployeeId}'
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
