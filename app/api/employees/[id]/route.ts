import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getSalesforceConnection,
  SF_OBJECTS,
  updateRecordInSalesforce,
  deleteRecordInSalesforce,
  querySingleRecord,
  SFEmployee
} from "@/lib/salesforce";
import { Employee, ApiResponse } from "@/types";

// ============================================
// GET SINGLE EMPLOYEE
// ============================================
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
    const conn = await getSalesforceConnection();
    
    const query = `
      SELECT 
        Id, Employee_ID__c, Contact__c ,Name, Contact__r.Email,Company_Email__c ,
        Department__c, Role__c, Status__c, Joining_Date__c, Base_Salary__c,
        CTC__c, Profile_Photo_URL__c, Team_Lead__c
      FROM ${SF_OBJECTS.EMPLOYEE}
      WHERE Id = '${employeeId}'
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
    const employee: Employee = {
      // Salesforce-style fields
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
      JoiningDate: record.Joining_Date__c,
      BaseSalary: record.Base_Salary__c,
      CTC: record.CTC__c,
      ProfilePhotoUrl: record.Profile_Photo_URL__c,
      TeamLeadId: record.Team_Lead__c,

      // UI-friendly aliases (camelCase)
      id: record.Id,
      firstName: record.Name,
      lastName: record.Name,
      email: record.Email,
      phone: record.Phone,
      department: record.Department__c,
      role: record.Role__c,
      status: (record.Status__c || '').toString(),
      joinDate: record.Join_Date__c,
      salary: record.Base_Salary__c || 0,
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
    const {
      phone,
      department,
      role,
      status,
      baseSalary,
      ctc,
      teamLeadId
    } = body;

    const updateData: Record<string, any> = {};

    if (phone) updateData.Phone = phone;
    if (department) updateData.Department__c = department;
    if (role) updateData.Role__c = role;
    if (status) updateData.Status__c = status;
    if (baseSalary !== undefined) updateData.Base_Salary__c = baseSalary;
    if (ctc !== undefined) updateData.CTC__c = ctc;
    if (teamLeadId !== undefined) updateData.Team_Lead__c = teamLeadId;

    const result = await updateRecordInSalesforce(
      SF_OBJECTS.EMPLOYEE,
      employeeId,
      updateData
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Failed to update employee", statusCode: 500 },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { id: employeeId, ...updateData },
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
