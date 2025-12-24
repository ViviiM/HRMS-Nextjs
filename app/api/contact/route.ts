import { NextRequest, NextResponse } from "next/server";
import { createRecordInSalesforce, SF_OBJECTS } from "@/lib/salesforce";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, message } = body;

    // Validation
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const contactData = {
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      Phone: phone,
      Description: message,
      // Providing defaults for custom fields if they happen to be required by your specific Org configuration
      // based on the interface definition, though often they are optional.
      // We'll leave them undefined unless we hit an error, as creating a simple Contact 
      // shouldn't require internal fields like Emergency Contact.
    };

    const result = await createRecordInSalesforce(SF_OBJECTS.CONTACT, contactData);

    if (result.success) {
      return NextResponse.json({ success: true, message: "Contact saved successfully" }, { status: 201 });
    } else {
      throw new Error("Failed to save to Salesforce");
    }
  } catch (error: any) {
    console.error("Contact API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
