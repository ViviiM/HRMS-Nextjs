import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  // TODO: Use sfId if available for faster lookup?
  // const sfId = session.user.sfId;

  try {
    // Strategy: Try Cache -> Fail -> Fetch SF -> Populate Cache
    
    // 1. Try Cache
    // PK: EMPLOYEE#<ID> ... Wait, we know email. GSI lookup?
    // GSI1PK = email
    
    // ... For simplicity in this iteration, let's fetch from Salesforce to be sure we have the full FRD profile.
    // In production, implement the cache lookups.

    const conn = await getSalesforceConnection();
    
    // Fetch Employee + Related Contact details
    const q = `
      SELECT 
        Id, Name, Employee_ID__c, Company_Email__c, Department__c, Role__c, 
        Joining_Date__c, Status__c, Profile_Photo_URL__c, Team_Lead__r.Name,
        Contact__r.FirstName, Contact__r.LastName, Contact__r.Email, Contact__r.Phone
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
        firstName: rec.Contact__r?.FirstName || rec.Name.split(' ')[0], // Fallback
        lastName: rec.Contact__r?.LastName,
        email: rec.Contact__r?.Email || rec.Company_Email__c,
        phone: rec.Contact__r?.Phone,
        dob: rec.Contact__r?.Date_of_Birth__c,
        gender: rec.Contact__r?.Gender__c,
        address: rec.Contact__r?.MailingAddress,
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
        teamLead: rec.Team_Lead__r?.Name,
        photoUrl: rec.Profile_Photo_URL__c
      }
    };

    return NextResponse.json({ success: true,  data: profile });

  } catch (error: any) {
    console.error("Profile Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
