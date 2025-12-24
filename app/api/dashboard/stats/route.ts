import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, executeCompositeRequest, SF_OBJECTS } from "@/lib/salesforce";
import { getAllEmployeesFromDynamo } from "@/lib/dynamo-integration";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     // ============================================
     // 1. STATS FROM DYNAMO DB (Primary Source for Employees)
     // ============================================
     let dynamoStats: any = null;
     
     try {
         const employees = await getAllEmployeesFromDynamo();
         if (employees.length > 0) {
             console.log(`Stats: Fetched ${employees.length} employees from DynamoDB`);
             
             // Calculate Stats
             const totalEmployees = employees.length; // Or filter by Status 'Active' if needed
             const activeEmployees = employees.filter((e: any) => e.Status__c === 'Active').length;
             
             // Department Breakdown
             const deptMap = new Map();
             employees.forEach((e: any) => {
                 const dept = e.Department || 'Unassigned';
                 if (!deptMap.has(dept)) deptMap.set(dept, 0);
                 deptMap.set(dept, deptMap.get(dept) + 1);
             });
             
             const departmentData = Array.from(deptMap.entries()).map(([name, count]) => ({
                 name,
                 employees: count,
                 budget: 0 // We might not have salary in Dynamo, or can sum it if we do
             }));

             dynamoStats = {
                 totalEmployees: activeEmployees, // Using Active as the main stat
                 departmentData
             };
         }
     } catch (e) {
         console.error("Stats: DynamoDB Fetch Failed, falling back to Salesforce", e);
     }
     
     // ============================================
     // 2. STATS FROM SALESFORCE (Fallback + Supplemental)
     // ============================================
     // We still need Active Leaves, Pending Approvals, Assets, etc.
     // If Dynamo failed, we also need Employees.
     
     const conn = await getSalesforceConnection();
     const v = conn.version || '58.0';
     const baseUrl = `/services/data/v${v}`;
     
     const queries = [];
     
     // Only query Employees if Dynamo failed
     if (!dynamoStats) {
        queries.push({
            refId: "totalEmployees",
            q: "SELECT count(Id) cnt FROM Employee__c WHERE Status__c = 'Active'"
        });
        queries.push({
             refId: "deptStats",
             q: "SELECT Department__c, count(Id) cnt FROM Employee__c GROUP BY Department__c"
        });
     }

     // Always query these (not in Dynamo yet)
     queries.push({
        refId: "activeLeaves",
        q: "SELECT count(Id) cnt FROM Leave__c WHERE Status__c = 'Approved' AND Start_Date__c <= TODAY AND End_Date__c >= TODAY"
     });
     queries.push({
        refId: "pendingApprovals",
        q: "SELECT count(Id) cnt FROM Leave__c WHERE Status__c = 'Applied'"
     });
     queries.push({
        refId: "availableAssets",
        q: `SELECT count(Id) cnt FROM ${SF_OBJECTS.ASSET} WHERE Status = 'Available'`
     });

     const subrequests = queries.map(q => ({
         method: "GET",
         url: `${baseUrl}/query?q=${encodeURIComponent(q.q)}`,
         referenceId: q.refId
     }));

     const response = await executeCompositeRequest(subrequests);
     
     const results: Record<string, any> = {};
     response.compositeResponse.forEach((res: any) => {
         if (res.httpStatusCode === 200) {
             results[res.referenceId] = res.body; 
         } else {
             results[res.referenceId] = null;
         }
     });

     // ============================================
     // 3. MERGE RESULTS
     // ============================================
     
     const data = {
         totalEmployees: dynamoStats 
            ? dynamoStats.totalEmployees 
            : (results.totalEmployees?.records[0]?.cnt || 0),
         
         departmentData: dynamoStats 
            ? dynamoStats.departmentData 
            : (results.deptStats?.records.map((r: any) => ({
                name: r.Department__c || 'Unknown',
                employees: r.cnt,
                budget: 0
            })) || []),

         activeLeaves: results.activeLeaves?.records[0]?.cnt || 0,
         pendingApprovals: results.pendingApprovals?.records[0]?.cnt || 0,
         availableAssets: results.availableAssets?.records[0]?.cnt || 0,
         
         leaveData: [], // Placeholder
         trainingData: [], // Placeholder
         recentActivities: [] // Placeholder
     };

     return NextResponse.json({
         success: true,
         data
     });

  } catch (error: any) {
     console.error("Dashboard API Error:", error);
     return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
