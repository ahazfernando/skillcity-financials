import { Task } from "@/types/financial";
import { sendTaskAssignmentEmail, sendTaskUpdateEmail } from "./emails";
import { TaskAssignmentEmailData, TaskUpdateEmailData } from "./templates";
import { getAllUsers } from "@/lib/firebase/users";
import { getAllEmployees } from "@/lib/firebase/employees";

/**
 * Get email address for a user ID
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const [users, employees] = await Promise.all([
      getAllUsers(),
      getAllEmployees(),
    ]);

    // Check in users first
    const user = users.find((u) => u.uid === userId);
    if (user?.email) {
      return user.email;
    }

    // Check in employees
    const employee = employees.find((e) => e.id === userId);
    if (employee?.email) {
      return employee.email;
    }

    return null;
  } catch (error) {
    console.error("Error getting user email:", error);
    return null;
  }
}

/**
 * Send email notifications when a task is created
 */
export async function notifyTaskAssignment(
  task: Task,
  assignedUserIds: string[],
  assignedByName: string
): Promise<void> {
  if (assignedUserIds.length === 0) {
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const taskUrl = `${baseUrl}/tasks`;

  // Get emails for all assigned users
  const emailPromises = assignedUserIds.map((userId) => getUserEmail(userId));
  const emails = await Promise.all(emailPromises);

  // Send emails to all assigned users
  const sendPromises = emails
    .filter((email): email is string => email !== null)
    .map(async (email, index) => {
      const userId = assignedUserIds[index];
      const userName = task.assignedToNames?.[index] || "Team Member";

      const emailData: TaskAssignmentEmailData = {
        recipientName: userName,
        taskTitle: task.title,
        taskDescription: task.description,
        deadline: task.deadline,
        priority: task.priority,
        siteName: task.siteName,
        assignedBy: assignedByName,
        taskUrl,
      };

      const result = await sendTaskAssignmentEmail(email, emailData);
      if (!result.success) {
        console.error(`Failed to send email to ${email}:`, result.error);
      }
      return result;
    });

  await Promise.allSettled(sendPromises);
}

/**
 * Send email notifications when a task is updated
 */
export async function notifyTaskUpdate(
  task: Task,
  updateType: "status" | "details" | "deadline" | "assignment",
  updateDetails: string,
  notifyUserIds?: string[]
): Promise<void> {
  const userIdsToNotify = notifyUserIds || task.assignedTo || [];
  if (userIdsToNotify.length === 0) {
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const taskUrl = `${baseUrl}/tasks`;

  // Get emails for all users to notify
  const emailPromises = userIdsToNotify.map((userId) => getUserEmail(userId));
  const emails = await Promise.all(emailPromises);

  // Send emails to all users
  const sendPromises = emails
    .filter((email): email is string => email !== null)
    .map(async (email, index) => {
      const userId = userIdsToNotify[index];
      const userName = task.assignedToNames?.[index] || "Team Member";

      const emailData: TaskUpdateEmailData = {
        recipientName: userName,
        taskTitle: task.title,
        updateType,
        updateDetails,
        taskUrl,
      };

      const result = await sendTaskUpdateEmail(email, emailData);
      if (!result.success) {
        console.error(`Failed to send email to ${email}:`, result.error);
      }
      return result;
    });

  await Promise.allSettled(sendPromises);
}

/**
 * Send email notification when task status changes
 */
export async function notifyTaskStatusChange(
  task: Task,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  if (oldStatus === newStatus) {
    return;
  }

  const statusLabels: Record<string, string> = {
    new: "New",
    in_progress: "In Progress",
    completed: "Completed",
  };

  const updateDetails = `Task status changed from "${statusLabels[oldStatus] || oldStatus}" to "${statusLabels[newStatus] || newStatus}".`;

  await notifyTaskUpdate(task, "status", updateDetails);
}

/**
 * Send email notification when task deadline changes
 */
export async function notifyTaskDeadlineChange(
  task: Task,
  oldDeadline?: string,
  newDeadline?: string
): Promise<void> {
  if (!newDeadline) {
    return;
  }

  const updateDetails = oldDeadline
    ? `Task deadline changed from ${new Date(oldDeadline).toLocaleDateString()} to ${new Date(newDeadline).toLocaleDateString()}.`
    : `Task deadline set to ${new Date(newDeadline).toLocaleDateString()}.`;

  await notifyTaskUpdate(task, "deadline", updateDetails);
}

/**
 * Send email notification when task assignment changes
 */
export async function notifyTaskAssignmentChange(
  task: Task,
  oldAssignedTo: string[],
  newAssignedTo: string[],
  assignedByName: string
): Promise<void> {
  // Find newly assigned users
  const newlyAssigned = newAssignedTo.filter((id) => !oldAssignedTo.includes(id));

  if (newlyAssigned.length > 0) {
    // Send assignment emails to newly assigned users
    const newTask: Task = {
      ...task,
      assignedTo: newlyAssigned,
    };
    await notifyTaskAssignment(newTask, newlyAssigned, assignedByName);
  }

  // Find removed users (optional - you might want to notify them too)
  const removed = oldAssignedTo.filter((id) => !newAssignedTo.includes(id));
  if (removed.length > 0) {
    const updateDetails = `You have been removed from the task "${task.title}".`;
    await notifyTaskUpdate(task, "assignment", updateDetails, removed);
  }
}

