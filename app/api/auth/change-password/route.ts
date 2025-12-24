import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS } from "@/lib/salesforce";
import { updateEmployeeInDynamo, getEmployeeFromDynamo } from "@/lib/dynamo-integration";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  try {
     const body = await req.json();
     const { newPassword, employeeId, tempPassword } = body;

     if(!newPassword || newPassword.length < 8) {
         return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
     }

     let targetEmployeeId: string | undefined;
     let isTempFlow = false;

     // 1. Determine Target Employee
     if (employeeId && tempPassword) {
         // Reset Flow via Link
         isTempFlow = true;
         const { decrypt } = await import('@/lib/crypto');
         
         // Verify Temp Password
         // Check DynamoDB first for speed
         const dynamoUser = await getEmployeeFromDynamo(employeeId);
         if (dynamoUser) {
             const storedTemp = dynamoUser.Password || dynamoUser.Password__c; 
             
             let isValid = false;
             try {
                 const decrypted = decrypt(storedTemp);
                 isValid = (decrypted === tempPassword);
             } catch(e) {
                 isValid = (storedTemp === tempPassword);
             }

             if (!isValid) {
                 return NextResponse.json({ error: "Invalid temporary credentials" }, { status: 401 });
             }
             targetEmployeeId = employeeId;
         } else {
             // Check Salesforce
             const conn = await getSalesforceConnection();
             const q = `SELECT Id, Password__c FROM Employee__c WHERE Employee_ID__c = '${employeeId}' LIMIT 1`;
             const result = await conn.query(q);
             if (result.totalSize === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
             
             const storedTemp = result.records[0].Password__c;
             let isValid = false;
             try {
                const decrypted = decrypt(storedTemp);
                isValid = (decrypted === tempPassword);
             } catch(e) {
                isValid = (storedTemp === tempPassword);
             }

             if (!isValid) {
                 return NextResponse.json({ error: "Invalid temporary credentials" }, { status: 401 });
             }
             targetEmployeeId = employeeId; 
         }
     } else {
         // Session Flow
         if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
         // Get ID from session
         targetEmployeeId = (session.user as any).employeeId; 
         
         // Fallback lookups if session missing ID (unlikely with new auth)
         if (!targetEmployeeId) {
             const conn = await getSalesforceConnection();
             const emp = await conn.query(`SELECT Employee_ID__c FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
             targetEmployeeId = emp.records[0]?.Employee_ID__c;
         }
     }

     if (!targetEmployeeId) {
         return NextResponse.json({ error: "Target user could not be identified" }, { status: 400 });
     }

     // 2. Update Password (Dual Write)
     const { encrypt } = await import('@/lib/crypto');
     let encryptedNewPassword = newPassword;
     try {
         encryptedNewPassword = encrypt(newPassword);
     } catch(e) {
         console.warn("Encryption failed for new password, storing plaintext");
     }
     
     // Salesforce Update
     const conn = await getSalesforceConnection();
     // We need SF Id to update
     let sfId = (session?.user as any)?.sfId;
     console.log("SF ID:", sfId , session?.user);
     if (!sfId) {
         const q = `SELECT Id FROM Employee__c WHERE Employee_ID__c = '${targetEmployeeId}' LIMIT 1`;
         const res = await conn.query(q);
         if(res.totalSize > 0) sfId = res.records[0].Id;
     }

     if (sfId) {
        console.log("Updating Salesforce Password for ID:", sfId);
        await conn.sobject("Employee__c").update({
            Id: sfId,
            Password__c: encryptedNewPassword,
            Is_Temp_Password__c: false
        });
     }

     // DynamoDB Update
     await updateEmployeeInDynamo(targetEmployeeId, {
         Password: encryptedNewPassword,
         IsTempPassword: false,
         Password__c: encryptedNewPassword, // Keeping redundancy if needed or cleaning up
         Is_Temp_Password__c: false
     });
     
     return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Change Password Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
