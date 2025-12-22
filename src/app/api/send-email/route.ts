import { NextRequest, NextResponse } from "next/server";
import {
  sendTaskAssignmentEmail,
  sendTaskUpdateEmail,
  sendTaskReminderEmail,
} from "@/lib/resend/emails";
import {
  TaskAssignmentEmailData,
  TaskUpdateEmailData,
  TaskReminderEmailData,
} from "@/lib/resend/templates";

/**
 * POST /api/send-email
 * Send email notifications
 * 
 * Body options:
 * 1. { type: "task_assignment", to: string, data: TaskAssignmentEmailData }
 * 2. { type: "task_update", to: string, data: TaskUpdateEmailData }
 * 3. { type: "task_reminder", to: string, data: TaskReminderEmailData }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, data } = body;

    if (!type || !to || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: type, to, and data are required",
        },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "task_assignment":
        result = await sendTaskAssignmentEmail(to, data as TaskAssignmentEmailData);
        break;
      case "task_update":
        result = await sendTaskUpdateEmail(to, data as TaskUpdateEmailData);
        break;
      case "task_reminder":
        result = await sendTaskReminderEmail(to, data as TaskReminderEmailData);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown email type: ${type}. Supported types: task_assignment, task_update, task_reminder`,
          },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send email",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in send-email API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send email",
      },
      { status: 500 }
    );
  }
}

