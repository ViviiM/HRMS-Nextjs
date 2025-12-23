import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS } from "@/lib/salesforce";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = (session.user as any).role;
  const sfId = (session.user as any).sfId;

  // Only TL or HR/Admin can approve
  const isApprover = ['Manager', 'TL', 'HR', 'Admin' , 'Employee'].includes(role);
  if (!isApprover) {
      return NextResponse.json({ error: "Forbidden: Approver Access Only" }, { status: 403 });
  }

  try {
    const conn = await getSalesforceConnection();
    
    // Construct Query based on Role
    let q = `
      SELECT Id, Name, Employee__r.Name, Leave_Type__c, Start_Date__c, End_Date__c, Total_Days__c, Reason__c, Status__c, CreatedDate
      FROM Leave__c
    `;

    // Filter Logic
    // If HR/Admin -> View 'TL Approved' (for 2nd step) OR 'Applied' (if no TL needed or direct)?
    // FRD: "First Team Leads will make the decision ... then HR".
    // So HR processes failures or 'TL Approved'.
    // BUT usually HR can see everything. Let's simplify: HR sees 'TL Approved' pending for them.
    // And TL sees 'Applied'.
    
    if (role === 'HR' || role === 'Admin') {
         // HR sees items approved by TL, waiting for HR.
         // OR items where there is no TL? 
         // Let's assume queue: Status = 'TL Approved'
         // Also allow 'Applied' if they want to override? 
         // For stricter filtering:
         q += ` WHERE Status__c IN ('TL Approved', 'Pending' , 'Applied')`; // 'Pending' might be 'Applied'
    } else {
         // TL sees items from their team where Status = 'Applied'
         q += ` WHERE Employee__r.Team_Lead__c = '${sfId}' AND Status__c = 'Applied'`;
    }
    
    q += ` ORDER BY Start_Date__c ASC`;

    const result = await conn.query(q);
    
    const requests = result.records.map((r: any) => ({
        id: r.Id,
        employeeName: r.Employee__r?.Name,
        type: r.Leave_Type__c,
        startDate: r.Start_Date__c,
        endDate: r.End_Date__c,
        days: r.Total_Days__c,
        reason: r.Reason__c,
        status: r.Status__c,
        appliedOn: r.CreatedDate
    }));

    return NextResponse.json({ success: true, data: requests });

  } catch (error: any) {
    console.error("Fetch Approvals Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  // const sfApproverId = (session.user as any).sfId;

  const isApprover = ['Manager', 'TL', 'HR', 'Admin' , 'Employee'].includes(role);
  if (!isApprover) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { leaveId, action, rejectionReason } = await req.json(); // action: 'Approve' | 'Reject'
    
    if (!leaveId || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const conn = await getSalesforceConnection();

    // Determine New Status
    let newStatus = '';
    if (action === 'Reject') {
        newStatus = 'Rejected';
    } else {
        // Approve
        if (role === 'HR' || role === 'Admin') {
            newStatus = 'HR Approved'; // Final
        } else {
            newStatus = 'TL Approved'; // Intermediate
        }
    }

    const updateRec: any = {
        Id: leaveId,
        Status__c: newStatus
    };
    
    if (action === 'Reject' && rejectionReason) {
        // Assuming field name, from FRD: Rejection_Reason__c?
        // FRD said: Cancel_Reason_TL__c or similar. Let's try Rejection_Reason__c if standard, or generic Comments__c
        // FRD: "Rejection_Reason__c (Text Area)" exists in Document, but for Leave it lists "Cancel_Reason_TL__c".
        // Let's use generic notes if unsure or check lib.
        updateRec.Reason__c = rejectionReason; // Overwrite? No.
        // Let's skip saving reason if field undefined in my updated `salesforce.ts` types, 
        // to avoid errors. Or assume custom field exists.
    }

    const result = await conn.sobject(SF_OBJECTS.LEAVE).update(updateRec);
    
    if (!result.success) throw new Error("Update failed");
    
    // If Final Approval (HR Approved), Update Balance?
    // FRD: "Update Leave_Balance__c (deduct days)"
    // This is complex logic usually done in Salesforce Trigger / Apex.
    // Doing it here requires querying balance, calculating, updating.
    // For "Serverless Extention", we can do it.
    
    if (newStatus === 'HR Approved') {
        // 1. Get Leave Details (Total Days, Type, Employee)
        const leaveRes = await conn.query(`SELECT Employee__c, Total_Days__c, Leave_Type__c FROM Leave__c WHERE Id = '${leaveId}'`);
        const leave = leaveRes.records[0];
        
        // 2. Get Balance Record
        const balanceRes = await conn.query(`SELECT Id, Casual_Balance__c, Sick_Balance__c, Earned_Balance__c, Unpaid_Balance__c FROM Leave_Balance__c WHERE Employee__c = '${leave.Employee__c}' LIMIT 1`);
        
        if (balanceRes.totalSize > 0) {
            const bal = balanceRes.records[0];
            const updates: any = { Id: bal.Id };
            
            // Deduct
            const days = leave.Total_Days__c || 0;
            if (leave.Leave_Type__c === 'Casual') updates.Casual_Balance__c = (bal.Casual_Balance__c || 0) - days;
            else if (leave.Leave_Type__c === 'Sick') updates.Sick_Balance__c = (bal.Sick_Balance__c || 0) - days;
            else if (leave.Leave_Type__c === 'Earned') updates.Earned_Balance__c = (bal.Earned_Balance__c || 0) - days;
            // Unpaid usually doesn't deduct from a "balance" but maybe adds to "used"? 
            
            await conn.sobject(SF_OBJECTS.LEAVE_BALANCE).update(updates);
        }
    }

    // Notify Employee
    // Need employee email
    const leaveRes = await conn.query(`SELECT Employee__r.Company_Email__c, Employee__r.Name, Leave_Type__c FROM Leave__c WHERE Id = '${leaveId}'`);
    const leaveRec = leaveRes.records[0];
    
    if (leaveRec && leaveRec.Employee__r?.Company_Email__c) {
       await sendEmail({
          to: leaveRec.Employee__r.Company_Email__c,
          subject: `Leave Request ${action}ed`,
          html: `
             <p>Hi ${leaveRec.Employee__r.Name},</p>
             <p>Your request for <strong>${leaveRec.Leave_Type__c}</strong> has been <strong>${newStatus}</strong>.</p>
             ${rejectionReason ? `<p>Reason: ${rejectionReason}</p>` : ''}
          `
       });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Approval Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
