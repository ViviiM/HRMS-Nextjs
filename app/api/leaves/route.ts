import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getSalesforceConnection,
  SF_OBJECTS,
  queryRecords,
  escapeSOQL,
  SFLeave
} from "@/lib/salesforce";
import { Leave, ApiResponse } from "@/types";

// ============================================
// GET LEAVE REQUESTS WITH FILTERS
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
    const status = searchParams.get("status");
    const leaveType = searchParams.get("leaveType");
    const employeeId = searchParams.get("employeeId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // Build conditions
    const conditions: string[] = [];

    if (status) {
      conditions.push(`Status__c = '${escapeSOQL(status)}'`);
    }

    if (leaveType) {
      conditions.push(`Leave_Type__c = '${escapeSOQL(leaveType)}'`);
    }

    if (employeeId) {
      conditions.push(`Employee__c = '${escapeSOQL(employeeId)}'`);
    }

    const offset = (page - 1) * pageSize;

    const fields = [
      "Id",
      "Employee__c",
      "Leave_Type__c",
      "Start_Date__c",
      "End_Date__c",
      "Total_Days__c",
      "Reason__c",
      "Status__c",
      "Approved_Date__c",
      "TL_Approval__c",
      "HR_Approval__c"
    ];

    let query = `SELECT ${fields.join(", ")} FROM ${SF_OBJECTS.LEAVE}`;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY Start_Date__c DESC LIMIT ${pageSize} OFFSET ${offset}`;

    // Count query
    const countQuery = `SELECT COUNT() FROM ${SF_OBJECTS.LEAVE}${
      conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : ""
    }`;

    const conn = await getSalesforceConnection();
    const result = await conn.query(query);
    const countResult = await conn.query(countQuery);

    const leaves: Leave[] = result.records.map((record: any) => ({
      Id: record.Id,
      EmployeeId: record.Employee__c,
      LeaveType: record.Leave_Type__c,
      StartDate: record.Start_Date__c,
      EndDate: record.End_Date__c,
      TotalDays: record.Total_Days__c,
      Reason: record.Reason__c,
      Status: record.Status__c,
      ApprovedDate: record.Approved_Date__c,
      TLApproval: record.TL_Approval__c,
      HRApproval: record.HR_Approval__c,
      Sandwich: false,
      OnePlusTwo: false
    }));

    const total = countResult.totalSize;
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json(
      {
        success: true,
        data: leaves,
        total,
        page,
        pageSize,
        totalPages,
        statusCode: 200
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Leave Fetch Error:", error);
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
// CREATE LEAVE REQUEST
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
      employeeId,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      sandwich,
      onePlusTwo
    } = body;

    // Validation
    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields", statusCode: 400 },
        { status: 400 }
      );
    }

    // Check leave balance
    const leaveBalanceQuery = `
      SELECT Annual_Leave__c, Casual_Balance__c, Sick_Balance__c, Earned_Balance__c 
      FROM ${SF_OBJECTS.LEAVE_BALANCE}
      WHERE Employee__c = '${employeeId}'
      LIMIT 1
    `;

    const conn = await getSalesforceConnection();
    const balanceResult = await conn.query(leaveBalanceQuery);

    if (balanceResult.totalSize === 0) {
      return NextResponse.json(
        { success: false, error: "Leave balance not found", statusCode: 404 },
        { status: 404 }
      );
    }

    const leaveRecord: SFLeave = {
      Employee__c: employeeId,
      Leave_Type__c: leaveType,
      Start_Date__c: startDate,
      End_Date__c: endDate,
      Total_Days__c: totalDays,
      Reason__c: reason,
      Status__c: "Applied",
      Sandwich__c: sandwich || false,
      One_Plus_Two__c: onePlusTwo || false,
      TL_Approval__c: false,
      HR_Approval__c: false
    };

    const result = await conn.create(SF_OBJECTS.LEAVE, leaveRecord);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          ...leaveRecord
        },
        message: "Leave request created successfully",
        statusCode: 201
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Leave Create Error:", error);
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

