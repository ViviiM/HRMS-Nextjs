import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email not sent.");
    return { success: false, error: 'API Key missing' };
  }

  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // Update with verified domain
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error };
  }
};
