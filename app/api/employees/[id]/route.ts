import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getSalesforceConnection,
  SF_OBJECTS,
  updateRecordInSalesforce,
  deleteRecordInSalesforce,
  querySingleRecord,
  SFEmployee,
  escapeSOQL
} from "@/lib/salesforce";
import { getEmployeeFromDynamo, updateEmployeeInDynamo } from "@/lib/dynamo-integration";
import { Employee, ApiResponse } from "@/types";

// ============================================
// GET SINGLE EMPLOYEE
// ============================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", statusCode: 401 },
      { status: 401 }
    );
  }

  try {
    const { id: employeeId } = await params;

    // 1. Try fetching from DynamoDB
    const dynamoRecord = await getEmployeeFromDynamo(employeeId);
    console.log("Dynamo Record:", dynamoRecord);
    if (dynamoRecord) {
        return NextResponse.json(
            { 
                success: true, 
                data: {
                    ...dynamoRecord, 
                    id: dynamoRecord.EmployeeId || dynamoRecord.id,
                    firstName: dynamoRecord.First_Name__c || dynamoRecord.FirstName || dynamoRecord.Name?.split(' ')[0],
                    lastName: dynamoRecord.Last_Name__c || dynamoRecord.LastName || dynamoRecord.Name?.split(' ')[1],
                    name: dynamoRecord.Name,
                    email: dynamoRecord.Company_Email__c || dynamoRecord.Email, // Prefer Company Email
                    personalEmail: dynamoRecord.Personal_Email__c || dynamoRecord.Contact_Email__c ||  dynamoRecord.Email,
                    phone: dynamoRecord.Phone,
                    department: dynamoRecord.Department,
                    role: dynamoRecord.Role,
                    status: dynamoRecord.Status__c,
                    joinDate: dynamoRecord.JoiningDate,
                    salary: dynamoRecord.Base_Salary__c,
                    ctc: dynamoRecord.CTC__c,
                    teamLeadId: dynamoRecord.TeamLeadId,
                    
                    // Personal Details (Mapping from DDB)
                    address: dynamoRecord.MailingStreet || dynamoRecord.Address,
                    city: dynamoRecord.MailingCity || dynamoRecord.City,
                    state: dynamoRecord.MailingState || dynamoRecord.State,
                    zipCode: dynamoRecord.MailingPostalCode || dynamoRecord.ZipCode,
                    nationality: dynamoRecord.MailingCountry || dynamoRecord.Country,
                    dob: dynamoRecord.Date_of_Birth__c || dynamoRecord.DOB,
                    gender: dynamoRecord.Gender__c || dynamoRecord.Gender,
                    experience: dynamoRecord.Experience__c,
                    emergencyContactName: dynamoRecord.Emergency_Contact_Name__c,
                    emergencyContactNumber: dynamoRecord.Emergency_Contact_Number__c,
                    emergencyContactRelation: dynamoRecord.Emergency_Contact_Relation__c
                }, 
                statusCode: 200 
            },
            { status: 200 }
        );
    }

    // 2. Fallback to Salesforce
    
    // ... (Salesforce Query omitted here as it is unchanged from previous step, but I need to be careful with replace_file_content target)
    // Wait, I can't skip the middle part if I am replacing a block that includes it.
    // I will target the GET block's Dynamo part specifically if possible, but I need to target the PUT part too.
    // I'll do two replaces. First GET.


    // 2. Fallback to Salesforce
    const conn = await getSalesforceConnection();
    
    const query = `
      SELECT 
        Id, Employee_ID__c, Contact__c, Name, Company_Email__c, 
        Department__c, Role__c, Status__c, Joining_Date__c, Base_Salary__c,
        CTC__c, Profile_Photo_URL__c, Team_Lead__c,
        Contact__r.Id, Contact__r.FirstName, Contact__r.LastName, Contact__r.Email, Contact__r.Phone,
        Contact__r.MailingStreet, Contact__r.MailingCity, Contact__r.MailingState, 
        Contact__r.MailingPostalCode, Contact__r.MailingCountry,
        Contact__r.Date_of_Birth__c, Contact__r.Gender__c, Contact__r.Experience__c,
        Contact__r.Emergency_Contact_Name__c, Contact__r.Emergency_Contact_Number__c, Contact__r.Emergency_Contact_Relation__c
      FROM ${SF_OBJECTS.EMPLOYEE}
      FROM ${SF_OBJECTS.EMPLOYEE}
      WHERE ${employeeId.startsWith('EMP-') ? `Employee_ID__c = '${escapeSOQL(employeeId)}'` : `Id = '${escapeSOQL(employeeId)}'`}
      LIMIT 1
    `;

    const result = await conn.query(query);

    if (result.totalSize === 0) {
      return NextResponse.json(
        { success: false, error: "Employee not found", statusCode: 404 },
        { status: 404 }
      );
    }

    const record = result.records[0];
    const contact = record.Contact__r || {};

    const employee: any = {
      // Salesforce-style fields
      Id: record.Id,
      EmployeeId: record.Employee_ID__c,
      ContactId: record.Contact__c, // Keep this for Reference
      
      // Core UI Fields
      id: record.Id,
      firstName: contact.FirstName || record.Name?.split(' ')[0], // Prefer Contact Name
      lastName: contact.LastName || record.Name?.split(' ')[1] || '',
      name: record.Name,
      
      // Emails
      email: record.Company_Email__c, // This is Company Email
      personalEmail: contact.Email,   // This is Personal Email
      
      // Contact
      phone: contact.Phone || record.Phone,
      
      // Employment
      department: record.Department__c,
      role: record.Role__c,
      status: record.Status__c,
      joinDate: record.Joining_Date__c,
      baseSalary: record.Base_Salary__c,
      ctc: record.CTC__c,
      teamLeadId: record.Team_Lead__c,
      profilePhotoUrl: record.Profile_Photo_URL__c,

      // Address & Personal
      address: contact.MailingStreet,
      city: contact.MailingCity,
      state: contact.MailingState,
      zipCode: contact.MailingPostalCode,
      nationality: contact.MailingCountry, // Using Country as Nationality mapped
      
      // Details
      dob: contact.Date_of_Birth__c,
      gender: contact.Gender__c,
      experience: contact.Experience__c,
      
      // Emergency
      emergencyContactName: contact.Emergency_Contact_Name__c,
      emergencyContactNumber: contact.Emergency_Contact_Number__c,
      emergencyContactRelation: contact.Emergency_Contact_Relation__c
    };

    return NextResponse.json(
      { success: true, data: employee, statusCode: 200 },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Employee Fetch Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
        statusCode: 500
      },
      { status: 500 }
    );
  }
}

// ============================================
// UPDATE EMPLOYEE
// ============================================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", statusCode: 401 },
      { status: 401 }
    );
  }

  try {
    const { id: employeeId } = await params;
    const body = await req.json();
    
    // Extract fields
    const {
      phone, department, role, status, baseSalary, ctc, teamLeadId,
      email, // Company Email (editable by HR)
      personalDetails
    } = body;

    const conn = await getSalesforceConnection();

    // 1. Fetch current Employee to get Contact ID
    const WHERE_CLAUSE = employeeId.startsWith('EMP-') ? `Employee_ID__c = '${escapeSOQL(employeeId)}'` : `Id = '${escapeSOQL(employeeId)}'`;
    const empQuery = `SELECT Id, Contact__c FROM ${SF_OBJECTS.EMPLOYEE} WHERE ${WHERE_CLAUSE} LIMIT 1`;
    const empResult = await conn.query(empQuery);
    if (empResult.totalSize === 0) {
         throw new Error("Employee not found");
    }
    const empRecord = empResult.records[0];
    const contactId = empRecord.Contact__c;

    // 1. Update DynamoDB
    const dynamoUpdateData: any = {};
    if (department) dynamoUpdateData.Department = department;
    if (role) dynamoUpdateData.Role = role;
    if (status) dynamoUpdateData.Status__c = status;
    if (baseSalary) dynamoUpdateData.Base_Salary__c = baseSalary;
    if (ctc) dynamoUpdateData.CTC__c = ctc;
    if (teamLeadId) dynamoUpdateData.TeamLeadId = teamLeadId;
    if (phone) dynamoUpdateData.Phone = phone;
    if (email) dynamoUpdateData.Company_Email__c = email;
    
    if (personalDetails) {
        if (personalDetails.address) dynamoUpdateData.MailingStreet = personalDetails.address;
        if (personalDetails.city) dynamoUpdateData.MailingCity = personalDetails.city;
        if (personalDetails.state) dynamoUpdateData.MailingState = personalDetails.state;
        if (personalDetails.zipCode) dynamoUpdateData.MailingPostalCode = personalDetails.zipCode;
        if (personalDetails.nationality) dynamoUpdateData.MailingCountry = personalDetails.nationality;
        if (personalDetails.dob) dynamoUpdateData.Date_of_Birth__c = personalDetails.dob;
        if (personalDetails.gender) dynamoUpdateData.Gender__c = personalDetails.gender;
        if (personalDetails.experience) dynamoUpdateData.Experience__c = personalDetails.experience;
        if (personalDetails.emergencyContact) dynamoUpdateData.Emergency_Contact_Name__c = personalDetails.emergencyContact;
        if (personalDetails.emergencyPhone) dynamoUpdateData.Emergency_Contact_Number__c = personalDetails.emergencyPhone;
        if (personalDetails.emergencyRelation) dynamoUpdateData.Emergency_Contact_Relation__c = personalDetails.emergencyRelation;
    }

    try {
        // Resolve Employee String ID if ID passed is Salesforce ID
        let stringId = employeeId;
        console.log("Employee ID:", employeeId);
        if (!stringId.startsWith('EMP')) {
            const q = `SELECT Employee_ID__c FROM Employee__c WHERE Id = '${employeeId}' LIMIT 1`;
            const res = await conn.query(q);
            console.log("Employee Result:", res);
            if (res.totalSize > 0) {
                stringId = res.records[0].Employee_ID__c;
            }
        }
        
        await updateEmployeeInDynamo(stringId, dynamoUpdateData);
    } catch (e) {
        console.error("Failed to update DynamoDB", e);
    }

    // 2. Prepare Employee Update (Salesforce)
    const empUpdateData: Record<string, any> = {};
    if (department) empUpdateData.Department__c = department;
    if (role) empUpdateData.Role__c = role;
    if (status) empUpdateData.Status__c = status;
    if (baseSalary !== undefined) empUpdateData.Base_Salary__c = baseSalary;
    if (ctc !== undefined) empUpdateData.CTC__c = ctc;
    if (teamLeadId !== undefined) empUpdateData.Team_Lead__c = teamLeadId;
    if (email) empUpdateData.Company_Email__c = email; 

    // 3. Prepare Contact Update (Personal Details)
    const contactUpdateData: Record<string, any> = {};
    if (phone) contactUpdateData.Phone = phone; // Phone usually on Contact
    
    if (personalDetails) {
        if (personalDetails.address) contactUpdateData.MailingStreet = personalDetails.address;
        if (personalDetails.city) contactUpdateData.MailingCity = personalDetails.city;
        if (personalDetails.state) contactUpdateData.MailingState = personalDetails.state;
        if (personalDetails.zipCode) contactUpdateData.MailingPostalCode = personalDetails.zipCode;
        if (personalDetails.nationality) contactUpdateData.MailingCountry = personalDetails.nationality;
        
        if (personalDetails.dob) contactUpdateData.Date_of_Birth__c = personalDetails.dob;
        if (personalDetails.gender) contactUpdateData.Gender__c = personalDetails.gender;
        if (personalDetails.experience) contactUpdateData.Experience__c = personalDetails.experience;
        
        if (personalDetails.emergencyContact) contactUpdateData.Emergency_Contact_Name__c = personalDetails.emergencyContact;
        if (personalDetails.emergencyPhone) contactUpdateData.Emergency_Contact_Number__c = personalDetails.emergencyPhone;
        if (personalDetails.emergencyRelation) contactUpdateData.Emergency_Contact_Relation__c = personalDetails.emergencyRelation;
    }

    // 4. Perform Updates
    // Update Employee
    if (Object.keys(empUpdateData).length > 0) {
         await updateRecordInSalesforce(SF_OBJECTS.EMPLOYEE, empRecord.Id, empUpdateData);
    }
    
    // Update Contact
    if (contactId && Object.keys(contactUpdateData).length > 0) {
         await updateRecordInSalesforce(SF_OBJECTS.CONTACT, contactId, contactUpdateData);
    }

    return NextResponse.json(
      {
        success: true,
        data: { id: employeeId, ...empUpdateData, ...contactUpdateData },
        message: "Employee updated successfully",
        statusCode: 200
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Employee Update Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
        statusCode: 500
      },
      { status: 500 }
    );
  }
}

// ============================================
// SOFT DELETE EMPLOYEE (Status = Resigned)
// ============================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", statusCode: 401 },
      { status: 401 }
    );
  }

  try {
    const { id: employeeId } = await params;
    // Soft delete: Update status to "Resign"
    const result = await updateRecordInSalesforce(
      SF_OBJECTS.EMPLOYEE,
      employeeId,
      {
        Status__c: "Resign",
        Leaving_Separation_Date__c: new Date().toISOString().split("T")[0]
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Failed to delete employee", statusCode: 500 },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { id: employeeId },
        message: "Employee deleted successfully",
        statusCode: 200
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Employee Delete Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
        statusCode: 500
      },
      { status: 500 }
    );
  }
}
