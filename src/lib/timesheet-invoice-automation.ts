/**
 * Timesheet to Invoice and Payroll Automation Service
 * 
 * This service handles:
 * 1. Automatic creation of invoices from pending timesheet records
 * 2. Automatic creation of payroll records from those invoices
 * 3. Includes employee GST status in both records
 */

import { WorkRecord, Employee, Invoice, PaymentStatus } from "@/types/financial";
import { getWorkRecordsByEmployee } from "@/lib/firebase/workRecords";
import { getEmployeeById, getEmployeeByEmail } from "@/lib/firebase/employees";
import { getEmployeePayRatesByEmployee } from "@/lib/firebase/employeePayRates";
import { getAllInvoices, addInvoice } from "@/lib/firebase/invoices";
import { getAllPayrolls } from "@/lib/firebase/payroll";
import { calculatePaymentDateAsDate } from "@/lib/paymentCycle";

/**
 * Generate invoice number for employee timesheet
 * Format: EMP-{EmployeeName}-{YYYY-MM}
 */
const generateInvoiceNumber = (employeeName: string, year: number, month: number): string => {
  const namePart = employeeName.replace(/\s+/g, "-").toUpperCase();
  const monthStr = String(month).padStart(2, "0");
  return `EMP-${namePart}-${year}-${monthStr}`;
};

/**
 * Format date to YYYY-MM-DD
 */
const formatDateYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get month start and end dates
 */
const getMonthDates = (year: number, month: number): { startDate: string; endDate: string } => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
};

/**
 * Calculate total earnings from work records using pay rates
 */
const calculateEarnings = async (
  records: WorkRecord[],
  employeeId: string
): Promise<{ totalHours: number; totalEarnings: number; currency: string; siteOfWork?: string }> => {
  const payRates = await getEmployeePayRatesByEmployee(employeeId);
  
  let totalHours = 0;
  let totalEarnings = 0;
  let currency = "AUD"; // Default
  const sites = new Set<string>();

  // Filter out leave records
  const workRecords = records.filter(r => !r.isLeave && r.clockOutTime);

  for (const record of workRecords) {
    totalHours += record.hoursWorked;

    // Find pay rate for this record's site
    let hourlyRate = 0;
    if (record.siteId && payRates.length > 0) {
      const payRate = payRates.find(pr => pr.siteId === record.siteId);
      if (payRate) {
        hourlyRate = payRate.hourlyRate;
        if (payRate.currency) currency = payRate.currency;
        if (payRate.siteName) sites.add(payRate.siteName);
      } else {
        // Use first available pay rate as fallback
        hourlyRate = payRates[0].hourlyRate;
        if (payRates[0].currency) currency = payRates[0].currency;
      }
    } else if (payRates.length > 0) {
      // Use first available pay rate
      hourlyRate = payRates[0].hourlyRate;
      if (payRates[0].currency) currency = payRates[0].currency;
    }

    totalEarnings += record.hoursWorked * hourlyRate;
  }

  // Get primary site (most common or first)
  const siteOfWork = sites.size > 0 ? Array.from(sites)[0] : undefined;

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    currency,
    siteOfWork,
  };
};

/**
 * Check if invoice already exists for employee and month
 */
const findExistingInvoice = async (
  employeeName: string,
  year: number,
  month: number
): Promise<Invoice | null> => {
  const invoices = await getAllInvoices();
  const invoiceNumber = generateInvoiceNumber(employeeName, year, month);
  
  return invoices.find(inv => inv.invoiceNumber === invoiceNumber) || null;
};

/**
 * Process timesheet records for an employee and create invoice/payroll if needed
 */
export const processEmployeeTimesheet = async (
  employeeId: string,
  employeeName: string,
  year: number,
  month: number
): Promise<{
  invoiceCreated: boolean;
  invoiceId?: string;
  payrollCreated: boolean;
  payrollId?: string;
  error?: string;
}> => {
  try {
    // Check if invoice already exists
    const existingInvoice = await findExistingInvoice(employeeName, year, month);
    if (existingInvoice) {
      // Invoice already exists, check if payroll exists
      const payrolls = await getAllPayrolls();
      const existingPayroll = payrolls.find(p => p.invoiceNumber === existingInvoice.invoiceNumber);
      
      return {
        invoiceCreated: false,
        invoiceId: existingInvoice.id,
        payrollCreated: !!existingPayroll,
        payrollId: existingPayroll?.id,
      };
    }

    // Get work records for the month
    const { startDate, endDate } = getMonthDates(year, month);
    const records = await getWorkRecordsByEmployee(employeeId, startDate, endDate);

    // Filter for pending records (only process pending timesheets)
    const pendingRecords = records.filter(r => r.approvalStatus === "pending" && r.clockOutTime);
    
    if (pendingRecords.length === 0) {
      return {
        invoiceCreated: false,
        payrollCreated: false,
        error: "No pending timesheet records found for this month",
      };
    }

    // Get employee data to fetch GST status
    let employee: Employee | null = null;
    try {
      // First try to get by ID (employee document ID)
      employee = await getEmployeeById(employeeId);
    } catch {
      // If that fails, try to find employee by matching with users
      try {
        const { getAllUsers } = await import("@/lib/firebase/users");
        const { getAllEmployees } = await import("@/lib/firebase/employees");
        const users = await getAllUsers();
        const allEmployees = await getAllEmployees();
        
        // Find user by Firebase UID
        const user = users.find(u => u.uid === employeeId);
        if (user) {
          // Find employee by email
          employee = allEmployees.find(emp => emp.email?.toLowerCase() === user.email?.toLowerCase()) || null;
        }
      } catch (err) {
        console.error("Error finding employee:", err);
      }
    }

    // Calculate earnings
    const { totalHours, totalEarnings, currency, siteOfWork } = await calculateEarnings(
      pendingRecords,
      employeeId
    );

    if (totalEarnings === 0) {
      return {
        invoiceCreated: false,
        payrollCreated: false,
        error: "No earnings calculated from timesheet records",
      };
    }

    // Get GST status from employee
    const gstRegistered = employee?.gstRegistered || false;
    const abnRegistered = employee?.abnRegistered || false;

    // Calculate GST (10% if registered)
    const gstAmount = gstRegistered ? Math.round(totalEarnings * 0.1 * 100) / 100 : 0;
    const amountExclGst = totalEarnings;
    const totalAmount = amountExclGst + gstAmount;

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber(employeeName, year, month);

    // Calculate dates
    const issueDate = new Date(year, month - 1, 1); // First day of the month
    const dueDate = calculatePaymentDateAsDate(issueDate, 45); // 45 days after issue date

    // Create invoice
    const invoiceData: Omit<Invoice, "id"> = {
      invoiceNumber,
      clientName: employeeName,
      name: employeeName,
      siteId: pendingRecords[0]?.siteId || "",
      siteOfWork: siteOfWork || pendingRecords[0]?.siteName || undefined,
      amount: amountExclGst,
      gst: gstAmount,
      totalAmount: totalAmount,
      issueDate: formatDateYYYYMMDD(issueDate),
      dueDate: formatDateYYYYMMDD(dueDate),
      status: "pending" as PaymentStatus,
      notes: `Auto-generated from timesheet for ${year}-${String(month).padStart(2, "0")}. Total hours: ${totalHours}`,
    };

    const invoiceId = await addInvoice(invoiceData);

    // The invoice creation will automatically trigger payroll creation via existing automation
    // But we'll wait a bit and check if payroll was created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const payrolls = await getAllPayrolls();
    const createdPayroll = payrolls.find(p => p.invoiceNumber === invoiceNumber);

    return {
      invoiceCreated: true,
      invoiceId,
      payrollCreated: !!createdPayroll,
      payrollId: createdPayroll?.id,
    };
  } catch (error: any) {
    console.error(`Error processing timesheet for ${employeeName} (${year}-${month}):`, error);
    return {
      invoiceCreated: false,
      payrollCreated: false,
      error: error.message || "Unknown error",
    };
  }
};

/**
 * Process timesheet when a work record is created/updated with pending status
 * This should be called when a timesheet record status becomes "pending"
 */
export const processTimesheetOnStatusChange = async (
  employeeId: string,
  employeeName: string,
  recordDate: string
): Promise<void> => {
  try {
    // Parse the date to get year and month
    const date = new Date(recordDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Process the timesheet for this month
    await processEmployeeTimesheet(employeeId, employeeName, year, month);
  } catch (error: any) {
    console.error(`Error processing timesheet on status change:`, error);
    // Don't throw - this is a background process
  }
};

/**
 * Process all pending timesheets for all employees for a specific month
 */
export const processAllPendingTimesheets = async (
  year: number,
  month: number
): Promise<{
  processed: number;
  invoicesCreated: number;
  payrollsCreated: number;
  errors: string[];
}> => {
  const result = {
    processed: 0,
    invoicesCreated: 0,
    payrollsCreated: 0,
    errors: [] as string[],
  };

  try {
    // Get all work records for the month
    const { startDate, endDate } = getMonthDates(year, month);
    const { getAllWorkRecords } = await import("@/lib/firebase/workRecords");
    const allRecords = await getAllWorkRecords(startDate, endDate);

    // Filter for pending records
    const pendingRecords = allRecords.filter(r => r.approvalStatus === "pending" && r.clockOutTime);

    // Group by employee
    const employeeGroups = new Map<string, { employeeId: string; employeeName: string }>();
    
    for (const record of pendingRecords) {
      const key = record.employeeId;
      if (!employeeGroups.has(key)) {
        employeeGroups.set(key, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
        });
      }
    }

    // Process each employee
    for (const { employeeId, employeeName } of employeeGroups.values()) {
      try {
        result.processed++;
        const processResult = await processEmployeeTimesheet(employeeId, employeeName, year, month);
        
        if (processResult.invoiceCreated) {
          result.invoicesCreated++;
        }
        if (processResult.payrollCreated) {
          result.payrollsCreated++;
        }
        if (processResult.error) {
          result.errors.push(`${employeeName}: ${processResult.error}`);
        }
      } catch (error: any) {
        result.errors.push(`${employeeName}: ${error.message || "Unknown error"}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Error processing timesheets: ${error.message || "Unknown error"}`);
  }

  return result;
};

