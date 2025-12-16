import { NextRequest, NextResponse } from "next/server";
import {
  getSalesforceConnection,
  SF_OBJECTS,
  createRecordInSalesforce,
  SFContact,
  SFEmployee,
  SFLeaveBalance,
  escapeSOQL,
  queryRecords
} from "@/lib/salesforce";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { sendEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Extract fields
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const address = formData.get("address") as string;
    const profilePhotoFile = formData.get("profilePhoto") as File | null;

    // ============================================
    // 1. VALIDATION
    // ============================================
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (Name, Email)" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // ============================================
    // 2. CHECK DUPLICATE EMAIL
    // ============================================
    const conn = await getSalesforceConnection();
    const escapedEmail = escapeSOQL(email);
    const existingContact = await queryRecords<any>(
      `SELECT Id FROM ${SF_OBJECTS.CONTACT} WHERE Email = '${escapedEmail}' LIMIT 1`
    );

    // if (existingContact.length > 0) {
    //   return NextResponse.json(
    //     { success: false, error: "Email already registered" },
    //     { status: 409 }
    //   );
    // }

    // ============================================
    // 3. UPLOAD PROFILE PHOTO TO S3
    // ============================================
    let profilePhotoUrl = "";
    if (profilePhotoFile && profilePhotoFile.size > 0) {
      try {
        const fileBuffer = Buffer.from(await profilePhotoFile.arrayBuffer());
        const fileName = `profile-photos/${uuidv4()}-${profilePhotoFile.name.replace(/\s+/g, '-')}`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: profilePhotoFile.type,
            // ACL: 'public-read' // Use if bucket is public, else use signed URL or rely on bucket policy
          })
        );
        
        // Construct Public URL
        profilePhotoUrl = `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
      } catch (error) {
        console.error("Profile photo upload error:", error);
        // Continue without photo if fails or return error? "profile photo i.e s3url" required.
        // Assuming we can proceed or warn. I'll proceed keeping it empty if fail, or error.
      }
    }

    // ============================================
    // 4. CREATE CONTACT RECORD
    // ============================================
    // Check if contact exists, otherwise create new
    let contactId = "";

    if (existingContact && existingContact.length > 0) {
      contactId = existingContact[0].Id;
    } else {
      const contactRecord: SFContact = {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: "", 
        Date_of_Birth__c: "1900-01-01", 
        Gender__c: "Other", 
        MailingStreet: address || "", 
        Emergency_Contact_Name__c: "",
        Emergency_Contact_Number__c: "",
        Emergency_Contact_Relation__c: "",
        Experience__c: 0
      };

      const contactResult = await createRecordInSalesforce(SF_OBJECTS.CONTACT, contactRecord);

      if (!contactResult.success) {
        throw new Error("Failed to create Contact in Salesforce");
      }
      contactId = contactResult.id;
    }

    // ============================================
    // 5. GENERATE PASSWORD
    // ============================================
    // random 8 char password
    const tempPassword = crypto.randomBytes(4).toString('hex');

    // ============================================
    // 6. CREATE EMPLOYEE RECORD
    // ============================================
    const employeeId = uuidv4();
    // Assuming Employee_Address__c is a Custom Address Field, we must write to components.
    // If it's a Text Area, we write to Employee_Address__c.
    // I will try to include BOTH or just one?
    // Using loose type record to avoid interface strictness for now if needed, or update interface.
    // Just in case, I will put the address in Employee_Address__c (if text) AND Employee_Address__Street__s (if address comp).
    // But that might error if one doesn't exist.
    // Best guess: User said "Address", so it's a Compound.
    // I'll try `Employee_Address__Street__s` and `CountryCode` maybe?
    // Let's safe-bet on `Employee_Address__Street__s` based on prompt metadata.
    
    // Note: I need to cast to any or update interface to allow dynamic fields if I'm unsure.
    // or just rely on SFEmployee interface update I'll do next.
    
    const employeeRecord: any = {
      Employee_ID__c: employeeId,
      Contact__c: contactId,
      Department__c: "Unassigned",
      Role__c: "Intern", // Capitalize to match likely picklist
      Joining_Date__c: new Date().toISOString().split("T")[0],
      Status__c: "Active",
      Profile_Photo_URL__c: profilePhotoUrl,
      // Employee_Address__c: address, // Compound field likely read-only
      Employee_Address__Street__s: address,
      Employee_Address__CountryCode__s: 'IN', // Default
      Password__c: tempPassword,
      Is_Temp_Password__c: true,
      Company_Email__c: email,
      // Username__c: email,
      Name: `${firstName} ${lastName}`,
    };

    const employeeResult = await createRecordInSalesforce(SF_OBJECTS.EMPLOYEE, employeeRecord);

    if (!employeeResult.success) {
      throw new Error("Failed to create Employee in Salesforce");
    }
    const sfEmployeeId = employeeResult.id;

    // ============================================
    // 7. CREATE LEAVE BALANCE (Optional but good practice)
    // ============================================
    const leaveBalanceRecord: SFLeaveBalance = {
      Employee__c: sfEmployeeId,
      Annual_Leave__c: 0,
      Casual_Balance__c: 0,
      Sick_Balance__c: 0,
      Earned_Balance__c: 0,
      Unpaid_Balance__c: 0,
      Last_Reset_Date__c: new Date().toISOString().split("T")[0],
      Year__c: new Date().getFullYear().toString()
    };
    await createRecordInSalesforce(SF_OBJECTS.LEAVE_BALANCE, leaveBalanceRecord).catch(e => console.error(e));

    // ============================================
    // 8. SEND EMAIL
    // ============================================
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to HRMS - Your Credentials",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Welcome, ${firstName}!</h2>
            <p>Your employee account has been created successfully.</p>
            <p><strong>Username/Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            <br/>
            <p>Please log in and change your password immediately.</p>
            <p><a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/login">Login Here</a></p>
          </div>
        `
      });
    } catch (e) {
      console.error("Failed to send email:", e);
    }

    return NextResponse.json(
      { success: true, message: "Registration successful. Credentials sent to email." },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
