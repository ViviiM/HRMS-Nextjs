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
    const employeeId = searchParams.get("employeeId") || session?.user?.sfId;
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

    let targetEmployeeId = employeeId;
    if (employeeId && employeeId.startsWith('EMP-')) {
         const conn = await getSalesforceConnection();
         const empQuery = `SELECT Id FROM ${SF_OBJECTS.EMPLOYEE} WHERE Employee_ID__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
         const empResult = await conn.query(empQuery);
         if (empResult.totalSize > 0) {
             targetEmployeeId = empResult.records[0].Id;
         }
    }

    if (targetEmployeeId) {
      conditions.push(`Employee__c = '${escapeSOQL(targetEmployeeId)}'`);
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
    let {
      employeeId,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      sandwich,
      onePlusTwo,
      halfDay,
      session: sessionType
    } = body;

    // Dynamically set employeeId from session if not provided
    if (!employeeId && session?.user?.sfId) {
      employeeId = session.user.sfId;
    }
    console.log('Sesion user' , session?.user)
    // Validation
    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      console.log("Missing required fields" , employeeId, leaveType, startDate, endDate, reason);
      return NextResponse.json(
        { success: false, error: "Missing required fields", statusCode: 400 },
        { status: 400 }
      );
    }

    // Half Day Validation
    if (halfDay) {
        if (startDate !== endDate) {
            return NextResponse.json(
                { success: false, error: "For Half Day, Start Date and End Date must be same.", statusCode: 400 },
                { status: 400 }
            );
        }
        totalDays = 0.5; // Enforce 0.5 for half day
    }

    // Session Logic
    const leaveSession = halfDay ? (sessionType || 'Full Day') : 'Full Day';

    let sfEmployeeId = employeeId;
    if (employeeId.startsWith('EMP-')) {
         const conn = await getSalesforceConnection();
         const empQuery = `SELECT Id FROM ${SF_OBJECTS.EMPLOYEE} WHERE Employee_ID__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
         const empResult = await conn.query(empQuery);
         if (empResult.totalSize > 0) {
             sfEmployeeId = empResult.records[0].Id;
         } else {
             return NextResponse.json(
                { success: false, error: "Invalid Employee ID", statusCode: 400 },
                { status: 400 }
             );
         }
    }

    // ---------------------------------------------------------
    // CALCULATION LOGIC: Sandwich & OnePlusTwo
    // ---------------------------------------------------------
    
    // Helper to check if a date is a weekend (Sat/Sun)
    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6; // 0=Sun, 6=Sat
    };

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    
    // Get Previous and Next Dates
    const prevDate = new Date(sDate);
    prevDate.setDate(sDate.getDate() - 1);
    
    const nextDate = new Date(eDate);
    nextDate.setDate(eDate.getDate() + 1);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const prevDateStr = formatDate(prevDate);
    const nextDateStr = formatDate(nextDate);
    
    // Query Holidays for Prev and Next dates
    // Using SF_OBJECTS.HOLIDAY which is 'Holiday__c'
    // Field assumption: Holiday_Date__c
    // We treat weekends as holidays for this logic + explicit holidays
    
    const conn = await getSalesforceConnection(); // Move connection up
    
    const holidayQuery = `SELECT Id, Holiday_Date__c FROM ${SF_OBJECTS.HOLIDAY} WHERE Holiday_Date__c IN ('${escapeSOQL(prevDateStr)}', '${escapeSOQL(nextDateStr)}')`;
    const holidayResult = await conn.query(holidayQuery);
    const holidayDates = new Set(holidayResult.records.map((h: any) => h.Holiday_Date__c));
    
    const isPrevOff = isWeekend(prevDate) || holidayDates.has(prevDateStr);
    const isNextOff = isWeekend(nextDate) || holidayDates.has(nextDateStr);
    
    const isSandwich = isPrevOff && isNextOff;
    const isOnePlusTwo = isPrevOff || isNextOff; // One leave + holidays
    
    // Override user input with calculated values
    sandwich = isSandwich;
    onePlusTwo = isOnePlusTwo;

    // Check leave balance
    const leaveBalanceQuery = `
      SELECT Annual_Leave__c, Casual_Balance__c, Sick_Balance__c, Earned_Balance__c 
      FROM ${SF_OBJECTS.LEAVE_BALANCE}
      WHERE Employee__c = '${sfEmployeeId}'
      LIMIT 1
    `;

    // const conn = await getSalesforceConnection(); // Already initialized above
    const balanceResult = await conn.query(leaveBalanceQuery);
    
    // Create Leave Record (Salesforce)
    const leaveRecord: SFLeave = {
      Employee__c: sfEmployeeId,
      Leave_Type__c: leaveType,
      Start_Date__c: startDate,
      End_Date__c: endDate,
      Total_Days__c: totalDays,
      Reason__c: reason,
      Status__c: "Applied",
      Sandwich__c: sandwich,
      One_Plus_Two__c: onePlusTwo,
      TL_Approval__c: false,
      HR_Approval__c: false,
      Session__c: leaveSession
    };

    const result = await conn.create(SF_OBJECTS.LEAVE, leaveRecord);
    const sfId = result.id;
    
    // Get correct Employee String ID for DynamoDB
    const dynamoEmployeeId = (session.user as any)?.employeeId || employeeId; 
    // Uses session's string ID if valid (most likely for logged in user), else falls back to passed ID (which might be SF ID unfortunately if called by Admin).
    // Ideally we want String ID. 
    // If we only have SF ID (employeeId), we technically should query or rely on consistency.
    // For now, if we are in this flow, 'employeeId' var holds the SF ID used for creation.
    // 'session.user.employeeId' holds the String ID (EMP-XX).
    
    // Create Leave Record (DynamoDB - Dual Write)
    if (result.success) {
        const { createLeaveRequestInDynamo } = await import('@/lib/dynamo-integration');
        await createLeaveRequestInDynamo({
            Id: sfId,
            EmployeeId: (session.user as any)?.employeeId || 'UNKNOWN', // Use String ID
            LeaveType: leaveType,
            StartDate: startDate,
            EndDate: endDate,
            TotalDays: totalDays,
            Reason: reason,
            Status: "Applied",
            Session: leaveSession,
            Sandwich: sandwich || false,
            OnePlusTwo: onePlusTwo || false,
            TLApproval: false,
            HRApproval: false
        });

        // ---------------------------------------------------------
        // NOTIFY HR Logic
        // ---------------------------------------------------------
        try {
            // 1. Find HR Employee(s) to notify
            // Query for an active employee with Role = 'HR'.
            const hrQuery = `SELECT Id, Employee_ID__c, Contact__r.Email , Company_Email__c FROM ${SF_OBJECTS.EMPLOYEE} WHERE Role__c = 'HR' AND Status__c = 'Active' LIMIT 1`;
            const hrResult = await conn.query(hrQuery);
            
            if (hrResult.totalSize > 0) {
                const hrEmployee = hrResult.records[0];
                const hrEmail = hrEmployee.Company_Email__c || hrEmployee.Contact__r?.Email;
                const hrId = hrEmployee.Id;
                
                // Fetch Applicant Name for email context
                let applicantName = "Employee";
                if (session?.user?.name) {
                    applicantName = session.user.name;
                } else {
                     // Try to get from SF if we have it
                     const applicantQuery = `SELECT Contact__r.FirstName, Contact__r.LastName FROM ${SF_OBJECTS.EMPLOYEE} WHERE Id = '${sfEmployeeId}' LIMIT 1`;
                     const applicantResult = await conn.query(applicantQuery);
                     if (applicantResult.totalSize > 0) {
                         applicantName = `${applicantResult.records[0].Contact__r?.FirstName || ''} ${applicantResult.records[0].Contact__r?.LastName || ''}`.trim();
                     }
                }

                // 2. Send Email to HR
                if (hrEmail) {
                    const { sendEmail } = await import('@/lib/email');
                    await sendEmail({
                        to: hrEmail,
                        subject: `New Leave Application: ${applicantName} - ${leaveType}`,
                        html: `
                          <h2>New Leave Application</h2>
                          <p><strong>Employee:</strong> ${applicantName}</p>
                          <p><strong>Leave Type:</strong> ${leaveType}</p>
                          <p><strong>Duration:</strong> ${startDate} to ${endDate} (${totalDays} days)</p>
                          <p><strong>Reason:</strong> ${reason}</p>
                          <br/>
                          <p>Reference ID: ${sfId}</p>
                          <p>Please log in to the HRMS portal to approve or reject this request.</p>
                        `
                    });
                }
                
                // 3. Create Notification for HR
                const notificationRecord = {
                    Employee__c: hrId,
                    Subject__c: `New Leave Request - ${applicantName}`,
                    Message__c: `${applicantName} has applied for ${leaveType} leave for ${totalDays} days.`,
                    Notification_Type__c: 'Leave',
                    Is_Read__c: false,
                    Action_Required__c: true,
                    Related_Record_ID__c: sfId,
                    Status__c: 'Pending'
                };
                
                const notifRes = await conn.create(SF_OBJECTS.NOTIFICATION, notificationRecord);
                
                // Sync Notification to DynamoDB
                if (notifRes.success) {
                    const { createNotificationInDynamo } = await import('@/lib/dynamo-integration');
                    // We need HR's String ID for DynamoDB partition Key (EMP-XX).
                    // The query above select Id, Email. We should select Employee_ID__c too.
                    // Assuming we updated query below:
                    
                     const hrStringId = hrEmployee.Employee_ID__c; 
                     if(hrStringId) {
                        await createNotificationInDynamo({
                            Id: notifRes.id,
                            EmployeeId: hrStringId,
                            LeaveType: leaveType,
                            StartDate: startDate,
                            EndDate: endDate,
                            TotalDays: totalDays,
                            Reason: reason,
                            Session: leaveSession,
                            Subject: notificationRecord.Subject__c,
                            Message: notificationRecord.Message__c,
                            Type: 'Leave',
                            IsRead: false,
                            ActionRequired: true,
                            RelatedRecordId: sfId,
                            Status: 'Pending'
                        });
                     }
                }
            }
        } catch (notifyError) {
            console.error("Failed to notify HR:", notifyError);
        }
    }

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

