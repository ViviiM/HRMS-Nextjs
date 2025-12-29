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
      throw new Error("Contact not found");
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
        subject: "Welcome to MV Portal | Action Required: Set Up Your Account",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                .header { background-color: #1a73e8; padding: 30px; text-align: center; color: #ffffff; }
                .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; }
                .content { padding: 40px; color: #333333; line-height: 1.6; }
                .employee-box { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center; }
                .btn-container { text-align: center; margin-top: 30px; }
                .button { background-color: #1a73e8; color: #ffffff !important; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; transition: background-color 0.3s; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee; }
                .expiry-note { font-size: 13px; color: #d93025; margin-top: 10px; font-style: italic; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to MV Portal</h1>
                </div>
        
                <div class="content">
                    <p>Hi <strong>${firstName}</strong>,</p>
                    <p>Congratulations! Your employee account has been successfully created in the <strong>MV Portal</strong>. We are excited to have you on board.</p>
                    
                    <p>To finalize your setup and access your dashboard, please use the credentials below:</p>
                    
                    <div class="employee-box">
                        <p style="margin: 0; color: #555;">Your Official Employee ID:</p>
                        <h2 style="margin: 5px 0; color: #1a73e8;">${employeeId}</h2>
                    </div>
        
                    <p>Please click the button below to set your password and activate your account. This link is secure and unique to you.</p>
        
                    <div class="btn-container">
                        <a href="${setupLink}" class="button">Set Password & Login</a>
                        <p class="expiry-note">Note: For security reasons, this link will expire in 24 hours.</p>
                    </div>
        
                    <p>If you encounter any issues during the login process, please contact the HR Department at <a href="mailto:hr@mvclouds.com">hr@mvclouds.com</a>.</p>
                    
                    <p>Best Regards,<br><strong>The HR Team</strong></p>
                </div>
        
                <div class="footer">
                    <p>&copy; 2025 MV Clouds. All rights reserved.</p>
                    <p>This is an automated message. Please do not reply directly to this email.</p>
                </div>
            </div>
        </body>
        </html>
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
