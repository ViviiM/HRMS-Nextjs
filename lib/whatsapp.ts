
import { getSalesforceConnection } from "./salesforce";

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0"; // Use a recent version
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

interface WhatsAppTemplateComponent {
  type: "header" | "body" | "footer";
  parameters: any[];
}

interface WhatsAppMessagePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: WhatsAppTemplateComponent[];
  };
}

/**
 * Sends a WhatsApp Template Message using the Meta WhatsApp Business API.
 * @param to Recipient's phone number (in E.164 format, e.g., "919876543210")
 * @param templateName The name of the approved template
 * @param languageCode Language code (default "en_US")
 * @param components Optional components (variables) for the template
 */
export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  languageCode: string = "en_US",
  components?: WhatsAppTemplateComponent[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("WhatsApp credentials are missing in environment variables.");
    return { success: false, error: "Server misconfiguration: Missing WhatsApp credentials." };
  }

  // Clean phone number: remove +, -, spaces
  const cleanPhone = to.replace(/[^0-9]/g, "");

  const payload: WhatsAppMessagePayload = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: components,
    },
  };

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("WhatsApp API Error Response:", JSON.stringify(data, null, 2));
        return { 
            success: false, 
            error: data.error?.message || "Failed to send WhatsApp message" 
        };
    }

    return { success: true, data };

  } catch (error: any) {
    console.error("WhatsApp Send Error:", error);
    return { success: false, error: error.message };
  }
}
