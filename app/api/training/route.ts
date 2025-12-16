import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const conn = await getSalesforceConnection();
     
     const q = `
       SELECT Id, Name, Description__c, Category__c, Instructor__c, Start_Date__c, End_Date__c, Duration_Hours__c, Max_Participants__c, Status__c
       FROM Training__c
       WHERE Status__c = 'Scheduled' OR Status__c = 'Ongoing'
     `;
     const result = await conn.query(q);
     
     const trainings = result.records.map((r: any) => ({
         id: r.Id,
         title: r.Name,
         description: r.Description__c,
         category: r.Category__c,
         instructor: r.Instructor__c,
         startDate: r.Start_Date__c,
         endDate: r.End_Date__c,
         duration: r.Duration_Hours__c,
         maxParticipants: r.Max_Participants__c,
         status: r.Status__c
     }));

     return NextResponse.json({ success: true, data: trainings });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
      const { trainingId } = await req.json();
      const conn = await getSalesforceConnection();
      
      let sfId = (session.user as any).sfId;
      if (!sfId) {
         const emp = await conn.query(`SELECT Id FROM Employee__c WHERE Company_Email__c = '${session.user.email}' LIMIT 1`);
         sfId = emp.records[0]?.Id;
      }

      await conn.sobject('Training_Enrollment__c').create({
          Employee__c: sfId,
          Training__c: trainingId,
          Status__c: 'Enrolled',
          Enrollment_Date__c: new Date().toISOString().split('T')[0]
      });

      return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
