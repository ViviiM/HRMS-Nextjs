
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { updateRecordInSalesforce, SF_OBJECTS, queryRecords } from "@/lib/salesforce";
import { updateNotificationInDynamo, getNotificationsFromDynamo } from "@/lib/dynamo-integration";

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sfId = (session.user as any).sfId;
    const employeeId = (session.user as any).employeeId;

    try {
        // 1. Fetch unread from SF to get IDs (or pass IDs from body, but read-all implies all for user)
        const q = `SELECT Id FROM ${SF_OBJECTS.NOTIFICATION} WHERE Employee__c = '${sfId}' AND Is_Read__c = false`;
        const unread = await queryRecords<any>(q);
        
        if (unread.length === 0) return NextResponse.json({ success: true });

        // 2. Update Salesforce
        // Simple loop or composite? For < 50, loop is acceptable or use Composite if available.
        // We implemented updateRecordInSalesforce (single).
        // Let's use Promise.all.
        
        const updatePromises = unread.map(rec => 
             updateRecordInSalesforce(SF_OBJECTS.NOTIFICATION, rec.Id, { Is_Read__c: true })
        );
        await Promise.all(updatePromises);

        // 3. Update DynamoDB (for cache consistency)
        const dynamoUpdates = unread.map(rec => 
            updateNotificationInDynamo(employeeId, rec.Id, { IsRead: true })
        );
        await Promise.all(dynamoUpdates);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
