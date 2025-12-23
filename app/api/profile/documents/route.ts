import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";
import { uploadToS3 } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

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

     if (!sfId) return NextResponse.json({ data: [] });

     const q = `
       SELECT Id, Name, Document_Type__c, Status__c, File_URL__c, CreatedDate
       FROM Document__c
       WHERE Employee__c = '${sfId}'
       ORDER BY CreatedDate DESC
     `;
     
     const result = await conn.query(q);
     return NextResponse.json({ success: true, data: result.records });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const formData = await req.formData();
     const file = formData.get("file") as File;
     const docType = formData.get("type") as string;
     
     if (!file || !docType) return NextResponse.json({ error: "Missing file or type" }, { status: 400 });

     const conn = await getSalesforceConnection();
     
     let sfId = (session.user as any).sfId;
     if (!sfId) {
        const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
        sfId = emp.records[0]?.Id;
     }

     // 1. Upload to S3
     const arrayBuffer = await file.arrayBuffer();
     const buffer = Buffer.from(arrayBuffer);
     // const key = `documents/${sfId}/${uuidv4()}-${file.name}`; // Generated in lib/s3
     const { url: s3Url } = await uploadToS3(buffer, file.name, "documents", file.type);
     
     // 2. Create Salesforce Record
     const docRecord = {
         Name: file.name,
         Employee__c: sfId,
         Document_Type__c: docType,
         Status__c: 'Pending Verification',
         File_URL__c: s3Url
     };
     
     const res = await conn.sobject('Document__c').create(docRecord);
     
     if (!res.success) throw new Error(res.errors[0].message);

     return NextResponse.json({ success: true, id: res.id, url: s3Url });

  } catch (error: any) {
    console.error("Doc Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
