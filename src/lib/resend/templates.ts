/**
 * Email templates for various notifications
 */

export interface TaskAssignmentEmailData {
  recipientName: string;
  taskTitle: string;
  taskDescription?: string;
  deadline?: string;
  priority: "high" | "mid" | "low";
  siteName?: string;
  assignedBy: string;
  taskUrl?: string;
}

export interface TaskUpdateEmailData {
  recipientName: string;
  taskTitle: string;
  updateType: "status" | "details" | "deadline" | "assignment";
  updateDetails: string;
  taskUrl?: string;
}

export interface TaskReminderEmailData {
  recipientName: string;
  taskTitle: string;
  deadline: string;
  daysUntilDeadline: number;
  taskUrl?: string;
}

/**
 * Generate HTML email template for task assignment
 */
export function generateTaskAssignmentEmail(data: TaskAssignmentEmailData): string {
  const priorityColors = {
    high: "#ef4444",
    mid: "#22c55e",
    low: "#3b82f6",
  };

  const priorityLabels = {
    high: "High Priority",
    mid: "Medium Priority",
    low: "Low Priority",
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Task Assignment</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Task Assigned</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${data.recipientName}</strong>,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            You have been assigned a new task by <strong>${data.assignedBy}</strong>.
          </p>
          
          <div style="background: #f9fafb; border-left: 4px solid ${priorityColors[data.priority]}; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h2 style="margin-top: 0; color: #111827; font-size: 20px;">${data.taskTitle}</h2>
            
            ${data.taskDescription ? `<p style="color: #6b7280; margin: 10px 0;">${data.taskDescription}</p>` : ""}
            
            <div style="margin-top: 15px;">
              <span style="background: ${priorityColors[data.priority]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                ${priorityLabels[data.priority]}
              </span>
            </div>
          </div>
          
          ${data.siteName ? `
            <div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 6px;">
              <p style="margin: 0; color: #0369a1; font-size: 14px;">
                <strong>📍 Site:</strong> ${data.siteName}
              </p>
            </div>
          ` : ""}
          
          ${data.deadline ? `
            <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 6px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>📅 Deadline:</strong> ${new Date(data.deadline).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          ` : ""}
          
          ${data.taskUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.taskUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Task Details
              </a>
            </div>
          ` : ""}
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Please log in to your dashboard to view and manage this task.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">This is an automated notification from Skill City Financial Management System.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML email template for task updates
 */
export function generateTaskUpdateEmail(data: TaskUpdateEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Updated</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Task Updated</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${data.recipientName}</strong>,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            The task <strong>"${data.taskTitle}"</strong> has been updated.
          </p>
          
          <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #111827; font-size: 16px;">
              ${data.updateDetails}
            </p>
          </div>
          
          ${data.taskUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.taskUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Updated Task
              </a>
            </div>
          ` : ""}
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">This is an automated notification from Skill City Financial Management System.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML email template for task reminders
 */
export function generateTaskReminderEmail(data: TaskReminderEmailData): string {
  const isOverdue = data.daysUntilDeadline < 0;
  const isUrgent = data.daysUntilDeadline <= 1;
  
  const bgColor = isOverdue ? "#fee2e2" : isUrgent ? "#fef3c7" : "#dbeafe";
  const textColor = isOverdue ? "#991b1b" : isUrgent ? "#92400e" : "#1e40af";
  const borderColor = isOverdue ? "#ef4444" : isUrgent ? "#f59e0b" : "#3b82f6";
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">
            ${isOverdue ? "⚠️ Task Overdue" : "⏰ Task Reminder"}
          </h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${data.recipientName}</strong>,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${isOverdue 
              ? `The task <strong>"${data.taskTitle}"</strong> is overdue.`
              : isUrgent
              ? `The task <strong>"${data.taskTitle}"</strong> is due soon!`
              : `This is a reminder about the task <strong>"${data.taskTitle}"</strong>.`
            }
          </p>
          
          <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h2 style="margin-top: 0; color: ${textColor}; font-size: 20px;">${data.taskTitle}</h2>
            
            <p style="color: ${textColor}; margin: 10px 0; font-size: 16px;">
              <strong>📅 Deadline:</strong> ${new Date(data.deadline).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            
            <p style="color: ${textColor}; margin: 10px 0; font-size: 16px;">
              <strong>${isOverdue ? "Overdue by:" : "Due in:"}</strong> ${Math.abs(data.daysUntilDeadline)} day${Math.abs(data.daysUntilDeadline) !== 1 ? "s" : ""}
            </p>
          </div>
          
          ${data.taskUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.taskUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Task Details
              </a>
            </div>
          ` : ""}
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">This is an automated notification from Skill City Financial Management System.</p>
        </div>
      </body>
    </html>
  `;
}

