import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password if 2FA is on, or normal password
  },
});

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("GMAIL_USER or GMAIL_APP_PASSWORD is not set. Email not sent.");
    return { success: false, error: 'Gmail credentials missing' };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
      to,
      subject,
      html,
    });
    return { success: true, data: info };
  } catch (error) {
    console.error("Gmail sending failed:", error);
    return { success: false, error };
  }
};
