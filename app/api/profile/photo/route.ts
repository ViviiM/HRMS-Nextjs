import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS } from "@/lib/salesforce";
import { uploadToS3 } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const formData = await req.formData();
     const file = formData.get("file") as File;
     
     if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

     // 1. Upload to S3
     const arrayBuffer = await file.arrayBuffer();
     const buffer = Buffer.from(arrayBuffer);
     const { url: s3Url } = await uploadToS3(buffer, file.name, "profileimages", file.type);
     
     // 2. Update Salesforce Record
     const conn = await getSalesforceConnection();
     
     let sfId = (session.user as any).sfId;
     if (!sfId) {
        const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
        sfId = emp.records[0]?.Id;
     }

     if (!sfId) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });

     const result = await conn.sobject(SF_OBJECTS.EMPLOYEE).update({
         Id: sfId,
         Profile_Photo_URL__c: s3Url
     });

     if (!result.success) throw new Error("Failed to update Salesforce record");

     return NextResponse.json({ success: true, url: s3Url });

  } catch (error: any) {
    console.error("Profile Photo Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
