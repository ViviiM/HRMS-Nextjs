
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { updateRecordInSalesforce, SF_OBJECTS } from "@/lib/salesforce";
import { updateNotificationInDynamo } from "@/lib/dynamo-integration";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const employeeId = (session.user as any).employeeId;

    try {
        // 1. Update Salesforce
        await updateRecordInSalesforce(SF_OBJECTS.NOTIFICATION, id, { Is_Read__c: true });
        
        // 2. Update DynamoDB
        await updateNotificationInDynamo(employeeId, id, { IsRead: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
