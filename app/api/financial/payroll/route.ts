import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const conn = await getSalesforceConnection();
     
     // 1. Get Employee ID
     // Typically session has employeeId (the custom field) or sfId. We need sfId for relationship query.
     // In authOptions we mapped sfId. 
     // Cast to any because TS defs for session might be needing update in lib, but runtime has it if populated.
     let sfId = (session.user as any).sfId;
     
     if (!sfId) {
         // Fallback query if session missing it
         const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
         sfId = emp.records[0]?.Id;
     }
     
     if(!sfId) return NextResponse.json({ data: [] });

     // 2. Fetch Monthly Payslips (History)
     // Object: Payroll__c (as per FRD) or Monthly_Payslip__c ? 
     // FRD Lists: "Payroll__c" with fields Basic_Salary__c etc.
     // AND "Monthly_Payslip__c".
     // Let's assume Payroll__c is the main object for Employee View.
     
     const q = `
       SELECT Id, Month__c, Year__c, Net_Salary__c, Gross_Salary__c, Total_Deductions__c, Payment_Status__c, Payment_Date__c, Payslip_URL__c
       FROM Payroll__c
       WHERE Employee__c = '${sfId}'
       ORDER BY Year__c DESC, Month__c DESC
     `;
     
     const result = await conn.query(q);
     
     return NextResponse.json({ success: true, data: result.records });

  } catch (error: any) {
    console.error("Payroll Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
