
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS, queryRecords, createRecordInSalesforce, escapeSOQL } from "@/lib/salesforce";
import { createNotificationInDynamo, getNotificationsFromDynamo, updateNotificationInDynamo } from "@/lib/dynamo-integration";


export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sfId = (session.user as any).sfId;
    const employeeId = (session.user as any).employeeId; // EMP-XXXX

    if (!sfId || !employeeId) return NextResponse.json({ data: [] });

    try {
        // 1. Primary Strategy: Fetch from DynamoDB
        const cachedData = await getNotificationsFromDynamo(employeeId);
        
        if (cachedData !== null) {
            // Cache Hit (Data found or empty array but success)
            return NextResponse.json({ success: true, data: cachedData });
        }

        console.warn(`DynamoDB fetch failed or unavailable for ${employeeId}. Fallback to Salesforce.`);

        // 2. Fallback: Fetch from Salesforce & Sync
        const q = `
            SELECT Id, Subject__c, Message__c, Notification_Type__c, Is_Read__c, Action_Required__c, 
                   Status__c, CreatedDate, Related_Record_ID__c, Action_Taken__c 
            FROM ${SF_OBJECTS.NOTIFICATION} 
            WHERE Employee__c = '${sfId}' 
            ORDER BY CreatedDate DESC LIMIT 50
        `;
        
        const sfNotifications = await queryRecords<any>(q);
        
        // Return immediately or await sync? Await sync to repair cache.
        const upsertPromises = sfNotifications.map(n => {
            const mapped = {
                Id: n.Id,
                EmployeeId: employeeId,
                Subject: n.Subject__c,
                Message: n.Message__c,
                Type: n.Notification_Type__c,
                IsRead: n.Is_Read__c,
                ActionRequired: n.Action_Required__c,
                Status: n.Status__c,
                CreatedDate: n.CreatedDate,
                RelatedRecordId: n.Related_Record_ID__c,
                ActionTaken: n.Action_Taken__c
            };
            return createNotificationInDynamo(mapped);
        });

        // Don't block response on sync if speed is critical, but robust fallback suggests repairing it now.
        await Promise.all(upsertPromises);

        const data = sfNotifications.map(n => ({
            Id: n.Id,
            Subject: n.Subject__c,
            Message: n.Message__c,
            Type: n.Notification_Type__c,
            IsRead: n.Is_Read__c,
            ActionRequired: n.Action_Required__c,
            Status: n.Status__c,
            CreatedDate: n.CreatedDate,
            RelatedRecordId: n.Related_Record_ID__c,
            ActionTaken: n.Action_Taken__c
        }));

        return NextResponse.json({ success: true, data, source: 'salesforce_fallback' });

    } catch (error: any) {
        console.error("Notification Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!['HR', 'Admin', 'Manager'].includes(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { employeeId, subject, message, type, actionRequired } = await req.json();

        if (!employeeId || !subject || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Resolve Salesforce Employee Id (if EMP- format)
        let targetSfId = employeeId;
        if (employeeId.startsWith('EMP-')) {
             const conn = await getSalesforceConnection();
             const res = await conn.query(`SELECT Id FROM ${SF_OBJECTS.EMPLOYEE} WHERE Employee_ID__c = '${escapeSOQL(employeeId)}' LIMIT 1`);
             if (res.totalSize > 0) {
                 targetSfId = res.records[0].Id;
             } else {
                 return NextResponse.json({ error: "Employee not found" }, { status: 404 });
             }
        }

        // 2. Create in Salesforce
        const sfData = {
            Employee__c: targetSfId,
            Subject__c: subject,
            Message__c: message,
            Notification_Type__c: type || 'Alert',
            Action_Required__c: actionRequired || false,
            Is_Read__c: false,
            Status__c: 'Pending'
        };

        const sfRes = await createRecordInSalesforce(SF_OBJECTS.NOTIFICATION, sfData);
        if (!sfRes.success) throw new Error("Failed to create in Salesforce");

        // 3. Create in DynamoDB (for real-time)
        await createNotificationInDynamo({
            Id: sfRes.id,
            EmployeeId: employeeId, // Store the External ID for client-side matching if using that, or store SF ID if consistent. 
            // Dynamo lookup uses EMP- ID usually? 
            // `getNotificationsFromDynamo` uses `EMP#${empId}`.
            // If `employeeId` passed is `EMP-001`, then keys are correct.
            // If `targetSfId` is passed, keys break.
            // We assume `employeeId` passed from frontend is the `id` from params (e.g. EMP-001).
            Subject: subject,
            Message: message,
            Type: type || 'Alert',
            IsRead: false,
            ActionRequired: actionRequired || false,
            Status: 'Pending'
        });

        return NextResponse.json({ success: true, id: sfRes.id });

    } catch (error: any) {
        console.error("Create Notification Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
