# Resend Email Integration Setup

This document explains how to set up and use Resend for email notifications in the Skill City Financial Management System.

## Prerequisites

1. **Install Resend Package**
   ```bash
   npm install resend
   ```

2. **Get Resend API Key**
   - Sign up at [resend.com](https://resend.com)
   - Create an API key from the dashboard
   - Verify your domain (or use Resend's test domain for development)

## Environment Variables

Add the following variables to your `.env.local` file:

```env
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Skill City Financial Management
RESEND_REPLY_TO=support@yourdomain.com

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### For Development:
- Use Resend's test domain: `onboarding@resend.dev`
- Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Features

### 1. Task Assignment Emails
When a new task is created and assigned to users, they receive an email notification with:
- Task title and description
- Priority level
- Deadline
- Site information
- Link to view the task

### 2. Task Update Emails
When a task is updated, assigned users receive notifications for:
- Status changes (New → In Progress → Completed)
- Deadline changes
- Assignment changes (added/removed from task)
- General task updates

### 3. Task Reminder Emails
(Optional - can be implemented with a cron job)
- Remind users about upcoming deadlines
- Notify about overdue tasks

## Usage

### Automatic Notifications
Email notifications are automatically sent when:
- A new task is created and assigned
- Task status is changed (via drag-and-drop or edit)
- Task deadline is updated
- Task assignments are modified

### Manual Email Sending
You can also send emails programmatically:

```typescript
import { sendTaskAssignmentEmail } from "@/lib/resend/emails";
import { TaskAssignmentEmailData } from "@/lib/resend/templates";

const emailData: TaskAssignmentEmailData = {
  recipientName: "John Doe",
  taskTitle: "Complete project documentation",
  taskDescription: "Please complete the project documentation by end of week",
  deadline: "2024-12-31",
  priority: "high",
  siteName: "Main Office",
  assignedBy: "Admin User",
  taskUrl: "https://yourdomain.com/tasks",
};

await sendTaskAssignmentEmail("john@example.com", emailData);
```

### API Endpoint
You can also send emails via the API:

```bash
POST /api/send-email
Content-Type: application/json

{
  "type": "task_assignment",
  "to": "user@example.com",
  "data": {
    "recipientName": "John Doe",
    "taskTitle": "Task Title",
    "priority": "high",
    "assignedBy": "Admin",
    ...
  }
}
```

## Email Templates

All email templates are located in `src/lib/resend/templates.ts`. You can customize:
- HTML structure
- Colors and styling
- Content and messaging

## Troubleshooting

### Emails Not Sending
1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly
2. **Check Domain**: Ensure your domain is verified in Resend dashboard
3. **Check Logs**: Look for console errors in the browser/server logs
4. **Test Mode**: Emails won't send if Resend is not configured (graceful failure)

### Common Issues
- **"Resend API key not configured"**: Add `RESEND_API_KEY` to `.env.local`
- **"Invalid email address"**: Verify email format
- **"Domain not verified"**: Verify your domain in Resend dashboard or use test domain

## Testing

1. Create a test task and assign it to a user
2. Check the user's email inbox
3. Verify email content and links work correctly
4. Test status changes via drag-and-drop

## Production Considerations

1. **Rate Limits**: Resend has rate limits (check your plan)
2. **Error Handling**: Email failures don't block task operations
3. **Bulk Emails**: Use `sendBulkEmails` for multiple recipients
4. **Monitoring**: Monitor email delivery in Resend dashboard

## Next Steps

- Set up scheduled reminders for upcoming deadlines
- Add email preferences for users
- Implement email templates for other notifications (invoices, payroll, etc.)

