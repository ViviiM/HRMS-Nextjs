import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS } from "@/lib/salesforce";
import { listCalendarEvents } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
     const conn = await getSalesforceConnection();
     
     // 1. Fetch Salesforce Holidays
     const q = `SELECT Id, Name, Date__c, Type__c, Description__c FROM ${SF_OBJECTS.HOLIDAY} ORDER BY Date__c ASC`;
     // Handling case where object might not exist yet -> catch error?
     let sfHolidays: any[] = [];
     try {
       const result = await conn.query(q);
       sfHolidays = result.records.map((r: any) => ({
           id: r.Id,
           name: r.Name,
           date: r.Date__c,
           type: r.Type__c || 'Public',
           description: r.Description__c,
           source: 'Salesforce'
       }));
     } catch (e) {
       console.warn("Could not fetch SF Holidays (Object might be missing):", e);
     }

     // 2. Fetch Google Calendar Events
     const googleEvents = await listCalendarEvents();
     const mappedGoogleEvents = (googleEvents || []).map((ev: any) => ({
         id: ev.id,
         name: ev.summary,
         date: ev.start?.date || ev.start?.dateTime?.split('T')[0],
         type: 'Google Event',
         description: ev.description,
         source: 'Google'
     }));

     // Merge and sort
     const allEvents = [...sfHolidays, ...mappedGoogleEvents].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

     return NextResponse.json({ success: true, data: allEvents });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only HR or Admin can add holidays
  const role = (session.user as any).role; // Assuming role is available in session
  if (role !== 'HR' && role !== 'Admin') {
       return NextResponse.json({ error: "Forbidden: Only HR can add holidays" }, { status: 403 });
  }

  try {
      const body = await req.json();
      const { name, date, type, description } = body;
      
      const conn = await getSalesforceConnection();
      
      await conn.sobject(SF_OBJECTS.HOLIDAY).create({
          Name: name,
          Date__c: date,
          Type__c: type,
          Description__c: description
      });

      return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
