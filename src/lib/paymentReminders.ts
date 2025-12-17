import { getAllEmployees, getEmployeeByEmail } from "./firebase/employees";
import { getAllUsers } from "./firebase/users";
import { getWorkRecordsByEmployee } from "./firebase/workRecords";
import { getAllReminders, addReminder, updateReminder } from "./firebase/reminders";
import { Employee, Reminder } from "@/types/financial";

const PAYMENT_CYCLE_DAYS = 45;

/**
 * Calculate payment due date based on work month
 * If employee works in January, payment is due on February 15th (45 days from Jan 1)
 */
export const calculatePaymentDueDate = (workYear: number, workMonth: number): Date => {
  // Start from the first day of the work month
  const workStartDate = new Date(workYear, workMonth - 1, 1);
  // Add 45 days
  const paymentDate = new Date(workStartDate);
  paymentDate.setDate(paymentDate.getDate() + PAYMENT_CYCLE_DAYS);
  return paymentDate;
};

/**
 * Get unique work months from work records
 */
export const getWorkMonths = (workRecords: any[]): Array<{ year: number; month: number }> => {
  const months = new Set<string>();
  
  workRecords.forEach(record => {
    if (record.date && record.clockOutTime && !record.isLeave) {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      months.add(`${year}-${month}`);
    }
  });
  
  return Array.from(months).map(key => {
    const [year, month] = key.split('-').map(Number);
    return { year, month };
  });
};

/**
 * Check if payment has been made (check if reminder is completed or payroll exists)
 */
export const isPaymentMade = async (
  employeeId: string,
  workYear: number,
  workMonth: number,
  existingReminders: Reminder[]
): Promise<boolean> => {
  // Check if there's a completed reminder for this payment
  const reminderKey = `payment-${employeeId}-${workYear}-${workMonth}`;
  const existingReminder = existingReminders.find(
    r => r.relatedId === reminderKey && r.status === "completed"
  );
  
  if (existingReminder) {
    return true;
  }
  
  // TODO: Could also check payroll records here if needed
  return false;
};

/**
 * Remove duplicate payment reminders
 * Keeps the most recent reminder for each relatedId
 */
export const removeDuplicateReminders = async (): Promise<number> => {
  try {
    const allReminders = await getAllReminders();
    const paymentReminders = allReminders.filter(r => r.type === "payment");
    
    // Group reminders by relatedId
    const remindersByRelatedId = new Map<string, Reminder[]>();
    paymentReminders.forEach(reminder => {
      if (!remindersByRelatedId.has(reminder.relatedId)) {
        remindersByRelatedId.set(reminder.relatedId, []);
      }
      remindersByRelatedId.get(reminder.relatedId)!.push(reminder);
    });
    
    // Find and delete duplicates (keep the most recent one)
    let duplicatesRemoved = 0;
    const { deleteReminder } = await import("./firebase/reminders");
    
    for (const [relatedId, reminders] of remindersByRelatedId.entries()) {
      if (reminders.length > 1) {
        // Sort by dueDate (most recent first), then by id
        reminders.sort((a, b) => {
          const dateCompare = new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          if (dateCompare !== 0) return dateCompare;
          return b.id.localeCompare(a.id);
        });
        
        // Keep the first one (most recent), delete the rest
        const toKeep = reminders[0];
        for (let i = 1; i < reminders.length; i++) {
          await deleteReminder(reminders[i].id);
          duplicatesRemoved++;
        }
      }
    }
    
    return duplicatesRemoved;
  } catch (error) {
    console.error("Error removing duplicate reminders:", error);
    return 0;
  }
};

/**
 * Generate payment reminders for all employees
 * This should be called daily or when reminders page loads
 */
export const generatePaymentReminders = async (): Promise<void> => {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // Only run on 1st or 15th+ of the month
    if (currentDay !== 1 && currentDay < 15) {
      return;
    }
    
    // First, clean up any existing duplicates
    await removeDuplicateReminders();
    
    // Get all employees (excluding admins)
    const [allEmployees, allUsers] = await Promise.all([
      getAllEmployees(),
      getAllUsers(),
    ]);
    
    // Create a set of admin user emails
    const adminEmails = new Set(
      allUsers
        .filter(user => user.role === "admin" || user.isAdmin)
        .map(user => user.email.toLowerCase())
    );
    
    // Filter out admins and clients
    const employees = allEmployees.filter(emp => {
      if (emp.type && emp.type !== "employee") return false;
      if (emp.role) {
        const roleLower = emp.role.toLowerCase().trim();
        if (roleLower === "admin" || roleLower === "administrator") return false;
      }
      if (emp.email && adminEmails.has(emp.email.toLowerCase())) return false;
      return true;
    });
    
    // Get existing reminders to avoid duplicates (refresh after cleanup)
    const existingReminders = await getAllReminders();
    
    // Create a map of employee email to Firebase Auth UID
    const emailToUidMap = new Map<string, string>();
    allUsers.forEach(user => {
      if (user.email) {
        emailToUidMap.set(user.email.toLowerCase(), user.uid);
      }
    });
    
    // Process each employee
    for (const employee of employees) {
      try {
        // Get Firebase Auth UID for this employee
        const firebaseUid = employee.email ? emailToUidMap.get(employee.email.toLowerCase()) : null;
        
        if (!firebaseUid) {
          // Skip if we can't find Firebase UID for this employee
          console.warn(`No Firebase UID found for employee ${employee.email}`);
          continue;
        }
        
        // Get all work records for this employee (using Firebase Auth UID)
        const workRecords = await getWorkRecordsByEmployee(firebaseUid);
        
        // Get unique work months
        const workMonths = getWorkMonths(workRecords);
        
        for (const { year, month } of workMonths) {
          // Calculate payment due date (45 days from first day of work month)
          const paymentDueDate = calculatePaymentDueDate(year, month);
          const paymentYear = paymentDueDate.getFullYear();
          const paymentMonth = paymentDueDate.getMonth() + 1;
          const paymentDay = paymentDueDate.getDate();
          
          // Check if we're in the payment month
          if (paymentYear === currentYear && paymentMonth === currentMonth) {
            // Check if payment has been made
            const paymentMade = await isPaymentMade(employee.id, year, month, existingReminders);
            
            if (paymentMade) {
              continue; // Skip if already paid
            }
            
            // Create reminder key to check for duplicates (use employee document ID)
            const reminderKey = `payment-${employee.id}-${year}-${month}`;
            
            // Check if reminder already exists (check by relatedId and type, regardless of status)
            // This prevents duplicates even if status changed
            const existingReminder = existingReminders.find(
              r => r.relatedId === reminderKey && r.type === "payment"
            );
            
            // Determine reminder type and priority
            let title: string;
            let description: string;
            let priority: "high" | "medium" | "low";
            let dueDate: string;
            let shouldCreate = false;
            
            if (currentDay === 1) {
              // Pending reminder on 1st of month
              if (!existingReminder) {
                title = `Employee Payment Pending - ${employee.name}`;
                description = `Payment for work done in ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} is pending. Due date: ${paymentDueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`;
                priority = "medium";
                dueDate = `${paymentYear}-${String(paymentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
                shouldCreate = true;
              } else if (existingReminder.status === "completed") {
                // If reminder was completed but payment wasn't actually made, reactivate it
                title = `Employee Payment Pending - ${employee.name}`;
                description = `Payment for work done in ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} is pending. Due date: ${paymentDueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`;
                priority = "medium";
                dueDate = `${paymentYear}-${String(paymentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
                
                await updateReminder(existingReminder.id, {
                  title,
                  description,
                  priority,
                  dueDate,
                  status: "pending",
                });
              }
            } else if (currentDay >= 15) {
              // Overdue reminder on 15th and after
              if (existingReminder) {
                // Update existing reminder to overdue if not already high priority
                if (existingReminder.priority !== "high" || existingReminder.status === "completed") {
                  title = `Employee Payment Overdue - ${employee.name}`;
                  description = `Payment for work done in ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} is overdue. Due date was: ${paymentDueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`;
                  priority = "high";
                  dueDate = `${paymentYear}-${String(paymentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
                  
                  await updateReminder(existingReminder.id, {
                    title,
                    description,
                    priority,
                    dueDate,
                    status: "pending",
                  });
                }
              } else {
                // Create new overdue reminder if it doesn't exist
                title = `Employee Payment Overdue - ${employee.name}`;
                description = `Payment for work done in ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} is overdue. Due date was: ${paymentDueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`;
                priority = "high";
                dueDate = `${paymentYear}-${String(paymentMonth).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`;
                shouldCreate = true;
              }
            } else {
              continue; // Skip if not 1st or 15th+
            }
            
            // Create the reminder if needed (only if it doesn't exist)
            if (shouldCreate && !existingReminder) {
              const reminder: Omit<Reminder, "id"> = {
                type: "payment",
                title,
                description,
                dueDate,
                priority,
                status: "pending",
                relatedId: reminderKey,
              };
              
              await addReminder(reminder);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing employee ${employee.id}:`, error);
        // Continue with next employee
      }
    }
  } catch (error) {
    console.error("Error generating payment reminders:", error);
    throw error;
  }
};

