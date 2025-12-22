import { Resend } from "resend";

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY || "");

// Email configuration
export const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
  fromName: process.env.RESEND_FROM_NAME || "Skill City Financial Management",
  replyTo: process.env.RESEND_REPLY_TO || "support@yourdomain.com",
};

// Verify Resend is configured
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0;
}

