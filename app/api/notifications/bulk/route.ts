
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS, executeCompositeRequest } from "@/lib/salesforce";
import { batchCreateNotificationsInDynamo } from "@/lib/dynamo-integration";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!['HR', 'Admin', 'Manager'].includes(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { subject, message, type, actionRequired } = await req.json();

        if (!subject || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch ALL Employees
        const conn = await getSalesforceConnection();
        // Query only essential fields. Filter active employees only ideally.
        const empRes = await conn.query(`SELECT Id, Employee_ID__c FROM ${SF_OBJECTS.EMPLOYEE} WHERE Status__c = 'Active'`);
        const employees = empRes.records;

        if (employees.length === 0) return NextResponse.json({ success: true, count: 0 });

        // Helper to chunk array
        const chunkArray = (arr: any[], size: number) => {
            const result = [];
            for (let i = 0; i < arr.length; i += size) {
                result.push(arr.slice(i, i + size));
            }
            return result;
        };

        // 2. Chunk employees into groups of 25 (Salesforce Composite Limit)
        const chunks = chunkArray(employees, 25);
        let successCount = 0;
        console.log("Total Employees:", employees);
        console.log("Total Chunks:", chunks.length);
        // Process chunks
        const processPromise = chunks.map(async (chunk) => {
            // A. Prepare Salesforce Composite Request
            // Each subrequest creates a Notification record
            const subrequests = chunk.map((emp: any) => ({
                method: "POST",
                url: `/services/data/v60.0/sobjects/${SF_OBJECTS.NOTIFICATION}`,
                referenceId: `ref${emp.Id}`,
                body: {
                    Employee__c: emp.Id,
                    Subject__c: subject,
                    Message__c: message,
                    Notification_Type__c: type || 'Alert',
                    Action_Required__c: actionRequired || false,
                    Is_Read__c: false,
                    Status__c: 'Pending'
                }
            }));

            // B. Execute Composite Request
            const compositeRes = await executeCompositeRequest(subrequests);
            
            // C. Parse results and prepare DynamoDB batch
            const dynamoItems: any[] = [];
            
            if (compositeRes.compositeResponse) {
                compositeRes.compositeResponse.forEach((res: any) => {
                    if (res.httpStatusCode === 201) {
                         // Find corresponding employee
                         const refId = res.referenceId;
                         const empIdRaw = refId.replace('ref', ''); // ID
                         const emp = chunk.find((e: any) => e.Id === empIdRaw);

                         if (emp) {
                             dynamoItems.push({
                                 Id: res.body.id, // SF ID
                                 EmployeeId: emp.Employee_ID__c || emp.Id, // Prefer External ID for consistency
                                 Subject: subject,
                                 Message: message,
                                 Type: type || 'Alert',
                                 IsRead: false,
                                 ActionRequired: actionRequired || false,
                                 Status: 'Pending'
                             });
                             successCount++;
                         }
                    } else {
                        console.error("Failed subrequest:", res);
                    }
                });
            }

            // D. Batch Write to DynamoDB
            if (dynamoItems.length > 0) {
                await batchCreateNotificationsInDynamo(dynamoItems);
            }
        });

        await Promise.all(processPromise);

        return NextResponse.json({ success: true, sentCount: successCount, totalEmployees: employees.length });

    } catch (error: any) {
        console.error("Bulk Notification Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
