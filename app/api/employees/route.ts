import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getSalesforceConnection,
  SF_OBJECTS,
  createRecordInSalesforce,
  queryRecords,
  buildSOQLQuery,
  escapeSOQL,
  SFEmployee,
  SFLeaveBalance
} from "@/lib/salesforce";
import { Employee, EmployeeFilters, ApiResponse, PaginatedResponse } from "@/types";

// ============================================
// GET EMPLOYEES WITH FILTERS
// ============================================
export async function GET(req: NextRequest): Promise<NextResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", statusCode: 401 },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // Build SOQL conditions
    const conditions: string[] = [];

    if (status) {
      conditions.push(`Status__c = '${escapeSOQL(status)}'`);
    }

    if (department) {
      conditions.push(`Department__c = '${escapeSOQL(department)}'`);
    }

    if (search) {
      const escapedSearch = escapeSOQL(search);
      conditions.push(
        `(Name LIKE '%${escapedSearch}%' OR Contact__r.Email as email LIKE '%${escapedSearch}%')`
      );
    }

    // Build query
    const fields = [
      "Id",
      "Employee_ID__c",
      "Contact__c",
      "Name",
      "Contact__r.Email",
      "Department__c",
      "Role__c",
      "Status__c",
      "Joining_Date__c",
      "Base_Salary__c",
      "Profile_Photo_URL__c",
      "Team_Lead__c"
    ];

    const offset = (page - 1) * pageSize;

    let query = `SELECT ${fields.join(", ")} FROM ${SF_OBJECTS.EMPLOYEE}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // query += ` ORDER BY FirstName ASC LIMIT ${pageSize} OFFSET ${offset}`;

    // Get total count
    const countQuery = `SELECT COUNT() FROM ${SF_OBJECTS.EMPLOYEE}${
      conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : ""
    }`;

    const conn = await getSalesforceConnection();
    const result = await conn.query(query);
    const countResult = await conn.query(countQuery);

    const employees: Employee[] = result.records.map((record: any) => ({
      Id: record.Id,
      EmployeeId: record.Employee_ID__c,
      ContactId: record.Contact__c,
      FirstName: record.Name,
      LastName: record.Name,
      Email: record.Contact__r.Email,
      Phone: record.Phone,
      Department: record.Department__c,
      Role: record.Role__c,
      Status: record.Status__c,
      JoiningDate: record.Join_Date__c,
      BaseSalary: record.Base_Salary__c,
      ProfilePhotoUrl: record.Profile_Photo_URL__c,
      TeamLeadId: record.Team_Lead__c
    }));

    const total = countResult.totalSize;
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: employees,
        total,
        page,
        pageSize,
        totalPages,
        statusCode: 200
      },
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
// CREATE NEW EMPLOYEE
// ============================================
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", statusCode: 401 },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      role,
      status,
      joinDate,
      baseSalary,
      ctc,
      teamLeadId
    } = body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields", statusCode: 400 },
        { status: 400 }
      );
    }

    // Check duplicate email
    const existingEmployee = await queryRecords<any>(
      `SELECT Id FROM ${SF_OBJECTS.EMPLOYEE} WHERE Email = '${escapeSOQL(email)}' LIMIT 1`
    );

    if (existingEmployee.length > 0) {
      return NextResponse.json(
        { success: false, error: "Email already registered", statusCode: 409 },
        { status: 409 }
      );
    }

    const conn = await getSalesforceConnection();

    // Step 1: Create Contact Record
    const contactRecord = {
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      Phone: phone,
      Date_of_Birth__c: "", // Will be updated later
      Gender__c: "Other",
      Experience__c: 0,
      Emergency_Contact_Name__c: "",
      Emergency_Contact_Number__c: "",
      Emergency_Contact_Relation__c: ""
    };

    const contactResult = await conn.create(SF_OBJECTS.CONTACT, contactRecord);
    const contactId = contactResult.id;

    // Step 2: Create Employee Record
    const employeeId = `EMP-${Date.now()}`;
    const employeeRecord: SFEmployee = {
      Employee_ID__c: employeeId,
      Contact__c: contactId,
      Department__c: department || "Unassigned",
      Role__c: role,
      Joining_Date__c: joinDate || new Date().toISOString().split("T")[0],
      Base_Salary__c: baseSalary || 0,
      CTC__c: ctc,
      Status__c: status || "Active",
      Team_Lead__c: teamLeadId
    };

    const employeeResult = await conn.create(SF_OBJECTS.EMPLOYEE, employeeRecord);
    const sfEmployeeId = employeeResult.id;

    // Step 3: Create Leave Balance Record
    const leaveBalanceRecord: SFLeaveBalance = {
      Employee__c: sfEmployeeId,
      Annual_Leave__c: 12, // Default values
      Casual_Balance__c: 6,
      Sick_Balance__c: 8,
      Earned_Balance__c: 0,
      Unpaid_Balance__c: 0,
      Last_Reset_Date__c: new Date().toISOString().split("T")[0],
      Year__c: new Date().getFullYear().toString()
    };

    try {
      await conn.create(SF_OBJECTS.LEAVE_BALANCE, leaveBalanceRecord);
    } catch (error) {
      console.error("Leave balance creation error:", error);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: sfEmployeeId,
          employeeId,
          contactId,
          firstName,
          lastName,
          email,
          department,
          role,
          status
        },
        message: "Employee created successfully",
        statusCode: 201
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Employee Create Error:", error);
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
