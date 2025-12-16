import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  console.log('session',session)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   console.log(session?.user?.email)
  try {
     const { newPassword } = await req.json();
     console.log('pass',newPassword)
     if(!newPassword || newPassword.length < 8) {
         return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
     }

     const conn = await getSalesforceConnection();
     
     // Get Employee ID
     let sfId = (session.user as any).sfId;
     console.log('id',sfId)
     if (!sfId) {
        const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
        sfId = emp.records[0]?.Id;
     }

     // Hash Password
   //   const hashedPassword = await bcrypt.hash(newPassword, 10);
     const hashedPassword = newPassword
     // Update Salesforce
     await conn.sobject("Employee__c").update({
         Id: sfId,
         Password__c: hashedPassword,
         Is_Temp_Password__c: false
     });
     
     return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
