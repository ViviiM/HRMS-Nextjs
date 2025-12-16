import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const conn = await getSalesforceConnection();
     
     const empRes = await conn.query("SELECT count(Id) cnt FROM Employee__c WHERE Status__c = 'Active'");
     const totalEmployees = empRes.records[0].cnt;

     const today = new Date().toISOString().split('T')[0];
     const leavesRes = await conn.query(`SELECT count(Id) cnt FROM Leave__c WHERE Status__c = 'Approved' AND Start_Date__c <= ${today} AND End_Date__c >= ${today}`);
     const activeLeaves = leavesRes.records[0].cnt;

     const pendingRes = await conn.query("SELECT count(Id) cnt FROM Leave__c WHERE Status__c = 'Applied'");
     const pendingApprovals = pendingRes.records[0].cnt;

     const assetsRes = await conn.query("SELECT count(Id) cnt FROM Asset__c WHERE Status__c = 'Available'");
     const availableAssets = assetsRes.records[0].cnt;

     return NextResponse.json({
         success: true,
         data: {
             totalEmployees,
             activeLeaves,
             pendingApprovals,
             availableAssets
         }
     });

  } catch (error: any) {
     return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
