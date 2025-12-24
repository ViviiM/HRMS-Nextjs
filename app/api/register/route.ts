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
import { createEmployeeInDynamo, createLeaveBalanceInDynamo } from "@/lib/dynamo-integration";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";
import { encrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract fields
    const { 
        firstName, 
        lastName, 
        email, 
        role, 
        department, 
        joiningDate 
    } = body;

    // ============================================
    // 1. VALIDATION
    // ============================================
    if (!firstName || !lastName || !email || !role || !department) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
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

    // ============================================
    // 3. CREATE CONTACT RECORD
    // ============================================
    let contactId = "";

    if (existingContact && existingContact.length > 0) {
      contactId = existingContact[0].Id;
    } else {
      const contactRecord: SFContact = {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: "", 
        Date_of_Birth__c: "", // Not asked in self-reg
        Gender__c: "Other", 
        MailingStreet: "", 
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
    // 4. GENERATE ID & PASSWORD
    // ============================================
    const timestamp = Date.now().toString().substr(-6);
    const employeeId = `EMP-${timestamp}`;
    const tempPassword = crypto.randomBytes(4).toString('hex');
    
    let encryptedPassword = tempPassword;
    try {
        encryptedPassword = encrypt(tempPassword);
    } catch (err: any) {
        console.error("Encryption failed, falling back to plaintext (Warning: Unsafe)", err.message);
        // We catch here to allow flow to complete even if encryption config is missing, 
        // but practically we should probably fail strict secure apps. 
        // User requested "proper error handling".
        if(err.message === 'ENCRYPTION_KEY not configured') {
            throw new Error("Server Configuration Error: Encryption Key missing.");
        }
        throw err;
    }

    // ============================================
    // 5. CREATE EMPLOYEE (Salesforce)
    // ============================================
    
    // Note: We use 'any' to bypass strict typed interface if fields like Password__c are missing from standard type defs
    const employeeRecord: any = {
      Employee_ID__c: employeeId,
      Contact__c: contactId,
      Department__c: department,
      Role__c: role, 
      Joining_Date__c: joiningDate || new Date().toISOString().split("T")[0],
      Status__c: "Active", // Assuming direct active or could be "Pending"
      Password__c: encryptedPassword,
      Is_Temp_Password__c: true,
      Company_Email__c: email,
      Name: `${firstName} ${lastName}`,
      Base_Salary__c: 0 // Default
    };

    const employeeResult = await createRecordInSalesforce(SF_OBJECTS.EMPLOYEE, employeeRecord);

    if (!employeeResult.success) {
      throw new Error("Failed to create Employee in Salesforce");
    }
    const sfEmployeeId = employeeResult.id;

    // ============================================
    // 6. CREATE EMPLOYEE (DynamoDB)
    // ============================================
    const dynamoRecord = {
      EmployeeId: employeeId,
      SfId: sfEmployeeId, // Storing Salesforce ID for session usage
      ContactId: contactId,
      FirstName: firstName,
      LastName: lastName,
      Name: `${firstName} ${lastName}`,
      Email: email,
      Phone: "",
      Department: department,
      Role: role,
      Status__c: "Active",
      JoiningDate: joiningDate,
      Password: encryptedPassword,
      IsTempPassword: true,
      
      // Flattened Contact Info
      Gender: "Other",
      Address: "",
      EmergencyName: "",
      EmergencyPhone: ""
    };

    try {
        await createEmployeeInDynamo(dynamoRecord);
    } catch (e) {
        console.error("DynamoDB Write Error:", e);
    }

    // ============================================
    // 7. CREATE LEAVE BALANCE (18 days rule)
    // ============================================
    const currentYear = new Date().getFullYear().toString();
    const leaveData = {
        Annual_Leave__c: 0,
        Casual_Balance__c: 12,
        Sick_Balance__c: 6,
        Earned_Balance__c: 0,
        Unpaid_Balance__c: 0,
        Last_Reset_Date__c: new Date().toISOString().split('T')[0],
        // Total_Days__c: 18, // Removed if not in SF Interface or keep if loose, but mostly irrelevant for strictly typed SF record unless ignored
    };

    // Dynamo
    try {
        await createLeaveBalanceInDynamo(employeeId, currentYear, { ...leaveData, Total_Days: 18 });
    } catch (e) {
        console.error("DynamoDB Leave Balance Error:", e);
    }

    // Salesforce
    const leaveBalanceRecord: SFLeaveBalance = {
      Employee__c: sfEmployeeId,
      Year__c: currentYear,
      ...leaveData
    };
    await createRecordInSalesforce(SF_OBJECTS.LEAVE_BALANCE, leaveBalanceRecord).catch(e => console.error("SF Leave Balance Error", e));

    // ============================================
    // 8. SEND EMAIL
    // ============================================
    const setupLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/change-password?id=${employeeId}&temp=${tempPassword}`;

    try {
      await sendEmail({
        to: email,
        subject: "Welcome to MV Portal - Account Created",
        html: `
            <h1>Welcome to MV Portal</h1>
            <p>Hi ${firstName},</p>
            <p>Your employee account has been created successfully.</p>
            <p><strong>Employee ID:</strong> ${employeeId}</p>
            <p>Please click the link below to set your password and access your account:</p>
            <a href="${setupLink}">Set Password and Login</a>
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
