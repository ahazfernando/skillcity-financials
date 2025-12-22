import { resend, EMAIL_CONFIG, isResendConfigured } from "./config";
import {
  generateTaskAssignmentEmail,
  generateTaskUpdateEmail,
  generateTaskReminderEmail,
  TaskAssignmentEmailData,
  TaskUpdateEmailData,
  TaskReminderEmailData,
} from "./templates";

/**
 * Send task assignment email
 */
export async function sendTaskAssignmentEmail(
  to: string,
  data: TaskAssignmentEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!isResendConfigured()) {
    console.warn("Resend is not configured. Email not sent.");
    return { success: false, error: "Resend API key not configured" };
  }

  try {
    const html = generateTaskAssignmentEmail(data);
    
    const result = await resend.emails.send({
      from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.from}>`,
      to: [to],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `New Task Assigned: ${data.taskTitle}`,
      html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error sending task assignment email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

/**
 * Send task update email
 */
export async function sendTaskUpdateEmail(
  to: string,
  data: TaskUpdateEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!isResendConfigured()) {
    console.warn("Resend is not configured. Email not sent.");
    return { success: false, error: "Resend API key not configured" };
  }

  try {
    const html = generateTaskUpdateEmail(data);
    
    const result = await resend.emails.send({
      from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.from}>`,
      to: [to],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Task Updated: ${data.taskTitle}`,
      html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error sending task update email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

/**
 * Send task reminder email
 */
export async function sendTaskReminderEmail(
  to: string,
  data: TaskReminderEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!isResendConfigured()) {
    console.warn("Resend is not configured. Email not sent.");
    return { success: false, error: "Resend API key not configured" };
  }

  try {
    const html = generateTaskReminderEmail(data);
    const isOverdue = data.daysUntilDeadline < 0;
    
    const result = await resend.emails.send({
      from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.from}>`,
      to: [to],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: isOverdue 
        ? `⚠️ Task Overdue: ${data.taskTitle}`
        : `⏰ Task Reminder: ${data.taskTitle}`,
      html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error sending task reminder email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  html: string
): Promise<{ success: boolean; sent: number; failed: number; errors?: string[] }> {
  if (!isResendConfigured()) {
    console.warn("Resend is not configured. Emails not sent.");
    return { success: false, sent: 0, failed: recipients.length, errors: ["Resend API key not configured"] };
  }

  const results = await Promise.allSettled(
    recipients.map((to) =>
      resend.emails.send({
        from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.from}>`,
        to: [to],
        replyTo: EMAIL_CONFIG.replyTo,
        subject,
        html,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message || "Unknown error");

  return { success: sent > 0, sent, failed, errors: errors.length > 0 ? errors : undefined };
}

