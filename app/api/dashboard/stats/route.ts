import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, executeCompositeRequest, SF_OBJECTS } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const conn = await getSalesforceConnection();
     const v = conn.version || '58.0';
     const baseUrl = `/services/data/v${v}`;
     
     // 1. Define queries
     const queries = [
        {
            refId: "totalEmployees",
            q: "SELECT count(Id) cnt FROM Employee__c WHERE Status__c = 'Active'"
        },
        {
            refId: "activeLeaves",
            q: "SELECT count(Id) cnt FROM Leave__c WHERE Status__c = 'Approved' AND Start_Date__c <= TODAY AND End_Date__c >= TODAY"
        },
        {
            refId: "pendingApprovals",
            q: "SELECT count(Id) cnt FROM Leave__c WHERE Status__c = 'Applied'"
        },
        {
            refId: "availableAssets",
            q: `SELECT count(Id) cnt FROM ${SF_OBJECTS.ASSET} WHERE Status = 'Available'`
        },
        {
             refId: "deptStats",
             q: "SELECT Department__c, count(Id) cnt, SUM(CTC__c) budget FROM Employee__c GROUP BY Department__c"
        },
        // {
        //      refId: "leaveTrend",
        //      q: "SELECT Calendar_Month(Start_Date__c) mth, Status__c, count(Id) cnt FROM Leave__c WHERE Start_Date__c = THIS_YEAR GROUP BY Calendar_Month(Start_Date__c), Status__c"
        // },
        // {
        //      refId: "trainingStats",
        //      q: "SELECT Status__c, count(Id) cnt FROM Training__c GROUP BY Status__c"
        // }
     ];

     // Note: If Audit Log doesn't exist, we might want to skip it or handle failure. 
     // We'll try to include it. If it fails, the rest works (allOrNone: false).
    //  queries.push({
    //      refId: "recentActivity",
    //      q: `SELECT Action__c, Details__c, Timestamp__c, Object_Type__c FROM ${SF_OBJECTS.AUDIT_LOG} ORDER BY Timestamp__c DESC LIMIT 5`
    //  });

     // 2. Build subrequests
     const subrequests = queries.map(q => ({
         method: "GET",
         url: `${baseUrl}/query?q=${encodeURIComponent(q.q)}`,
         referenceId: q.refId
     }));

     // 3. Execute Composite Request
     const response = await executeCompositeRequest(subrequests);
     
     // 4. Process Response
     const results: Record<string, any> = {};
     response.compositeResponse.forEach((res: any) => {
         if (res.httpStatusCode === 200) {
             results[res.referenceId] = res.body; 
         } else {
             // Log error but don't crash, returns null/empty for that part
             console.error(`Error in subrequest ${res.referenceId}:`, res.body);
             results[res.referenceId] = null;
         }
     });

     // 5. Map to Frontend Structure
     const data = {
         totalEmployees: results.totalEmployees?.records[0]?.cnt || 0,
         activeLeaves: results.activeLeaves?.records[0]?.cnt || 0,
         pendingApprovals: results.pendingApprovals?.records[0]?.cnt || 0,
         availableAssets: results.availableAssets?.records[0]?.cnt || 0,
         
         departmentData: results.deptStats?.records.map((r: any) => ({
             name: r.Department__c || 'Unknown',
             employees: r.cnt,
             budget: r.budget || 0
         })) || [],

         leaveData: processLeaveTrend(results.leaveTrend?.records || []),
         
         trainingData: processTrainingStats(results.trainingStats?.records || []),
         
         recentActivities: results.recentActivity?.records.map((r: any) => ({
             id: r.Id,
             type: r.Object_Type__c?.toLowerCase() || 'system',
             message: `${r.Action__c}: ${r.Details__c}`,
             timestamp: r.Timestamp__c,
         })) || []
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

function processLeaveTrend(records: any[]) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // Initialize map with all months 0 to avoid gaps if needed, or just populated ones.
    // Let's populate all months up to current month effectively? Or just what's returned.
    const map = new Map();
    
    // Pre-fill?
    // months.forEach((m, i) => map.set(i + 1, { month: m, approved: 0, pending: 0, rejected: 0 }));

    records.forEach(r => {
        const m = r.mth; // Calendar_Month returns 1-12
        if(!m) return;
        const status = r.Status__c?.toLowerCase() || '';
        
        if (!map.has(m)) map.set(m, { month: months[m-1], approved: 0, pending: 0, rejected: 0 });
        const entry = map.get(m);
        
        if (status === 'approved') entry.approved += r.cnt;
        else if (status === 'applied' || status === 'pending') entry.pending += r.cnt;
        else if (status === 'rejected') entry.rejected += r.cnt;
    });
    
    return Array.from(map.values()).sort((a,b) => months.indexOf(a.month) - months.indexOf(b.month));
}

function processTrainingStats(records: any[]) {
    const colors: any = { 
        'Completed': '#0891b2', 
        'In Progress': '#2563eb', 
        'Ongoing': '#2563eb', 
        'Scheduled': '#f59e0b', 
        'Pending': '#f59e0b' 
    };
    
    return records.map(r => ({
        name: r.Status__c,
        value: r.cnt,
        fill: colors[r.Status__c] || '#94a3b8'
    }));
}
