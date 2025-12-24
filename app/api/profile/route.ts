
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { 
    getSalesforceConnection, 
    SF_OBJECTS, 
    updateRecordInSalesforce, 
    querySingleRecord 
} from "@/lib/salesforce";
import { 
    getEmployeeFromDynamo, 
    updateEmployeeInDynamo 
} from "@/lib/dynamo-integration";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  const employeeId = (session.user as any).employeeId; // From updated token

  try {
    // 1. Try DynamoDB First (if we have ID)
    if (employeeId) {
        const cached = await getEmployeeFromDynamo(employeeId);
        if (cached) {
            // Map to Profile Schema (Personal / Employment)
            // Assuming simplified mapping for now matching the existing frontend expectations
            const profile = {
                personal: {
                    firstName: cached.FirstName, 
                    lastName: cached.LastName,
                    email: cached.Email,
                    phone: cached.Phone,
                    dob: cached.Date_of_Birth__c || cached.Gender, // Some fields were flattened
                    gender: cached.Gender,
                    address: cached.Address,
                    emergency: {
                        name: cached.EmergencyName,
                        number: cached.EmergencyPhone
                    }
                },
                employment: {
                    employeeId: cached.EmployeeId,
                    companyEmail: cached.Email,
                    department: cached.Department,
                    role: cached.Role,
                    joiningDate: cached.JoiningDate,
                    status: cached.Status__c,
                    teamLead: cached.TeamLeadId, // ID or Name? Frontend might want name
                    photoUrl: cached.ProfilePhotoUrl || cached.Profile_Photo_URL__c // Fallback
                }
            };
            return NextResponse.json({ success: true, data: profile });
        }
    }

    // 2. Fallback to Salesforce
    const conn = await getSalesforceConnection();
    
    // Fetch Employee + Related Contact details
    const q = `
      SELECT 
        Id, Name, Employee_ID__c, Company_Email__c, Department__c, Role__c, 
        Joining_Date__c, Status__c, Profile_Photo_URL__c, Team_Lead__r.Name,
        Contact__c,
        Contact__r.FirstName, Contact__r.LastName, Contact__r.Email, Contact__r.Phone,
        Contact__r.Date_of_Birth__c, Contact__r.Gender__c, Contact__r.MailingAddress,
        Contact__r.Emergency_Contact_Name__c, Contact__r.Emergency_Contact_Number__c
      FROM Employee__c 
      WHERE Company_Email__c = '${email}' 
      LIMIT 1
    `;

    const result = await conn.query(q);

    if (result.totalSize === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const rec = result.records[0];

    // Transform to frontend friendly format
    const profile = {
      personal: {
        firstName: rec.Contact__r?.FirstName || rec.Name.split(' ')[0], 
        lastName: rec.Contact__r?.LastName,
        email: rec.Contact__r?.Email || rec.Company_Email__c,
        phone: rec.Contact__r?.Phone,
        dob: rec.Contact__r?.Date_of_Birth__c,
        gender: rec.Contact__r?.Gender__c,
        address: rec.Contact__r?.MailingAddress, // This object/string handling depends on SF setup
        emergency: {
          name: rec.Contact__r?.Emergency_Contact_Name__c,
          number: rec.Contact__r?.Emergency_Contact_Number__c
        }
      },
      employment: {
        employeeId: rec.Employee_ID__c,
        companyEmail: rec.Company_Email__c,
        department: rec.Department__c,
        role: rec.Role__c,
        joiningDate: rec.Joining_Date__c,
        status: rec.Status__c,
        teamLead: rec.Team_Lead__r?.Name, // Ensure backend provides Name if needed
        photoUrl: rec.Profile_Photo_URL__c
      }
    };

    return NextResponse.json({ success: true,  data: profile });

  } catch (error: any) {
    console.error("Profile Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employeeId = (session.user as any).employeeId;

    try {
        const body = await req.json();
        const { personal, employment } = body; 
        // Note: Employment details usually read-only for users, but assuming Personal update

        // Fields mapping from Profile Form -> DB
        // Assuming body structure: { personal: { phone, address... } }
        
        // 1. Update Salesforce (Master)
        // We need Contact ID first.
        const conn = await getSalesforceConnection();
        const empQuery = await conn.query(`SELECT Id, Contact__c FROM Employee__c WHERE Employee_ID__c = '${employeeId}' LIMIT 1`);
        
        if (empQuery.totalSize === 0) return NextResponse.json({ error: "User record not found" }, { status: 404 });
        const empRecord = empQuery.records[0];

        // Update Contact
        if (empRecord.Contact__c && personal) {
             const contactUpdate: any = {};
             if (personal.phone) contactUpdate.Phone = personal.phone;
             if (personal.address) contactUpdate.MailingStreet = personal.address; 
             if (personal.gender) contactUpdate.Gender__c = personal.gender;
             if (personal.dob) contactUpdate.Date_of_Birth__c = personal.dob;
             if (personal.emergency?.name) contactUpdate.Emergency_Contact_Name__c = personal.emergency.name;
             if (personal.emergency?.number) contactUpdate.Emergency_Contact_Number__c = personal.emergency.number;
             
             if (Object.keys(contactUpdate).length > 0) {
                 await conn.sobject(SF_OBJECTS.CONTACT).update({
                     Id: empRecord.Contact__c,
                     ...contactUpdate
                 });
             }
        }
        
        // Update Employee (if any employment fields or flattened fields)
        // Employee Object might have flat fields? Our Dynamo schema has them flattened.
        // If SF Employee object doesn't store address/phone, we just updated Contact.
        
        // 2. Update DynamoDB (Cache)
        // Our Dynamo schema stores flattened Personal Details for speed.
        const dynamoUpdate: any = {};
        if (personal) {
            if (personal.phone) dynamoUpdate.Phone = personal.phone;
            if (personal.address) dynamoUpdate.Address = personal.address;
            if (personal.gender) dynamoUpdate.Gender = personal.gender;
            if (personal.dob) dynamoUpdate.Date_of_Birth__c = personal.dob; // or DOB? Key consistency
            if (personal.emergency?.name) dynamoUpdate.EmergencyName = personal.emergency.name;
            if (personal.emergency?.number) dynamoUpdate.EmergencyPhone = personal.emergency.number;
        }

        if (employeeId) {
            await updateEmployeeInDynamo(employeeId, dynamoUpdate);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Profile Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
