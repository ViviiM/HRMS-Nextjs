
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSalesforceConnection, SF_OBJECTS, escapeSOQL } from "@/lib/salesforce";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only HR/Admin can send manual notifications
  const userRole = (session.user as any).role;
  if (!['HR', 'Admin', 'Manager'].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { employeeId, template, variables } = await req.json();

    if (!employeeId || !template) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve Employee Phone
    const conn = await getSalesforceConnection();
    let q = `SELECT Name, Contact__r.Phone FROM ${SF_OBJECTS.EMPLOYEE} `;
    
    if (employeeId.startsWith('EMP-')) {
        q += `WHERE Employee_ID__c = '${escapeSOQL(employeeId)}' LIMIT 1`;
    } else {
        q += `WHERE Id = '${escapeSOQL(employeeId)}' LIMIT 1`;
    }

    const res = await conn.query(q);
    const emp = res.records[0];

    if (!emp || !emp.Contact__r?.Phone) {
        return NextResponse.json({ error: "Employee phone number not found" }, { status: 404 });
    }

    const phone = emp.Contact__r.Phone;
    const name = emp.Name;

    // Prepare components
    // If template is 'hr_notification', variables might be [messageBody]
    // We map frontend variables to 'components' structure required by Lib
    
    // Default structure: Body Variables
    // The library expects `WhatsAppTemplateComponent[]`.
    // We can simplify and just construct it here.
    
    const components = [
        {
            type: "body",
            parameters: variables.map((v: string) => ({ type: "text", text: v }))
        }
    ];

    const result = await sendWhatsAppMessage(phone, template, "en_US", components as any);

    if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });

  } catch (error: any) {
    console.error("WhatsApp Notification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
