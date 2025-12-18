/**
 * Invoice and Payroll Automation Service
 * 
 * This service handles:
 * 1. Automatic status updates for invoices (pending on 1st, overdue from 15th)
 * 2. Automatic creation of payroll records when invoices become pending/overdue
 * 3. Synchronization between invoices and payroll collections
 */

import { Invoice, PaymentStatus, Payroll, CashFlowMode, CashFlowType } from "@/types/financial";
import { getAllInvoices, updateInvoice } from "@/lib/firebase/invoices";
import { getAllPayrolls, addPayroll } from "@/lib/firebase/payroll";
import { calculatePaymentDateAsDate } from "@/lib/paymentCycle";

/**
 * Parse date string in various formats (ISO, DD.MM.YYYY, etc.)
 */
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Try DD.MM.YYYY format first
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  
  // Try ISO format (YYYY-MM-DD)
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  return null;
};

/**
 * Calculate the current status of an invoice based on its issue date
 * Rules:
 * - Invoice filled in November becomes "pending" on December 1st
 * - Invoice becomes "overdue" from December 15th onwards
 */
export const calculateInvoiceStatus = (issueDate: string): PaymentStatus => {
  if (!issueDate) return "pending";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Parse issue date
  const issue = parseDate(issueDate);
  if (!issue) {
    console.warn(`Invalid issue date format: ${issueDate}`);
    return "pending";
  }
  issue.setHours(0, 0, 0, 0);
  
  // Get the month after the issue date (payment month)
  const paymentMonth = new Date(issue);
  paymentMonth.setMonth(paymentMonth.getMonth() + 1);
  paymentMonth.setDate(1); // First day of the payment month
  
  // Get the 15th of the payment month (overdue date)
  const overdueDate = new Date(paymentMonth);
  overdueDate.setDate(15);
  
  // If today is before the 1st of payment month, status is still "pending"
  if (today < paymentMonth) {
    return "pending";
  }
  
  // If today is on or after the 15th of payment month, status is "overdue"
  if (today >= overdueDate) {
    return "overdue";
  }
  
  // If today is between 1st and 14th of payment month, status is "pending"
  return "pending";
};

/**
 * Format date to DD.MM.YYYY format
 */
const formatDateDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Get month name from date
 */
const getMonthName = (date: Date): string => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[date.getMonth()];
};

/**
 * Check if a payroll record already exists for an invoice
 */
const findExistingPayrollForInvoice = (
  invoice: Invoice,
  payrolls: Payroll[]
): Payroll | null => {
  return payrolls.find((p) => {
    // Match by invoice number (most reliable)
    if (p.invoiceNumber && invoice.invoiceNumber && p.invoiceNumber === invoice.invoiceNumber) {
      return true;
    }
    
    // Match by name, site, and date proximity
    if (p.name === invoice.name && p.siteOfWork === invoice.siteOfWork) {
      const payrollDate = parseDate(p.date);
      const invoiceDate = parseDate(invoice.issueDate);
      
      if (payrollDate && invoiceDate) {
        // Check if dates are within 1 day of each other
        const timeDiff = Math.abs(payrollDate.getTime() - invoiceDate.getTime());
        if (timeDiff < 86400000) { // Within 1 day
          return true;
        }
      }
    }
    
    return false;
  }) || null;
};

/**
 * Create a payroll record from an invoice
 */
const createPayrollFromInvoice = async (
  invoice: Invoice,
  status: PaymentStatus
): Promise<string | null> => {
  try {
    // Calculate the payment date (1st of the month after issue date)
    const issueDate = parseDate(invoice.issueDate);
    if (!issueDate) {
      console.error(`Invalid issue date for invoice ${invoice.invoiceNumber}`);
      return null;
    }
    
    const paymentDate = new Date(issueDate);
    paymentDate.setMonth(paymentDate.getMonth() + 1);
    paymentDate.setDate(1);
    
    // Determine if this is an inflow or outflow
    // For employee invoices, this is typically an outflow (we pay the employee)
    const modeOfCashFlow: CashFlowMode = "outflow";
    const typeOfCashFlow: CashFlowType = "internal_payroll";
    
    const payrollData: Omit<Payroll, "id"> = {
      month: getMonthName(paymentDate),
      date: formatDateDDMMYYYY(paymentDate),
      modeOfCashFlow,
      typeOfCashFlow,
      name: invoice.name || invoice.clientName,
      siteOfWork: invoice.siteOfWork,
      abnRegistered: false, // Default, can be updated later
      gstRegistered: invoice.gst > 0, // If GST exists, assume registered
      invoiceNumber: invoice.invoiceNumber,
      amountExclGst: invoice.amount,
      gstAmount: invoice.gst,
      totalAmount: invoice.totalAmount,
      currency: "AUD",
      paymentMethod: "bank_transfer",
      status: status,
      notes: `Auto-generated from invoice ${invoice.invoiceNumber}`,
    };
    
    const payrollId = await addPayroll(payrollData);
    return payrollId;
  } catch (error) {
    console.error(`Error creating payroll from invoice ${invoice.invoiceNumber}:`, error);
    return null;
  }
};

/**
 * Update invoice status and create/update payroll records
 */
export const processInvoiceStatusUpdate = async (
  invoice: Invoice,
  payrolls: Payroll[]
): Promise<{
  statusUpdated: boolean;
  payrollCreated: boolean;
  payrollId?: string;
}> => {
  const result = {
    statusUpdated: false,
    payrollCreated: false,
    payrollId: undefined as string | undefined,
  };
  
  try {
    // Calculate the correct status based on current date
    const newStatus = calculateInvoiceStatus(invoice.issueDate);
    
    // Update invoice status if it has changed
    if (invoice.status !== newStatus && 
        invoice.status !== "paid" && 
        invoice.status !== "received") {
      await updateInvoice(invoice.id, { status: newStatus });
      result.statusUpdated = true;
    }
    
    // Check if we need to create a payroll record
    // Only create payroll when status becomes "pending" or "overdue"
    if (newStatus === "pending" || newStatus === "overdue") {
      const existingPayroll = findExistingPayrollForInvoice(invoice, payrolls);
      
      if (!existingPayroll) {
        // Create new payroll record
        const payrollId = await createPayrollFromInvoice(invoice, newStatus);
        if (payrollId) {
          result.payrollCreated = true;
          result.payrollId = payrollId;
        }
      } else {
        // Update existing payroll status if needed
        if (existingPayroll.status !== newStatus) {
          // Note: We would need to import updatePayroll here if we want to update
          // For now, we'll just create new ones if they don't exist
        }
      }
    }
  } catch (error) {
    console.error(`Error processing invoice ${invoice.id}:`, error);
  }
  
  return result;
};

/**
 * Process all invoices and update their statuses, creating payroll records as needed
 * This function should be called periodically (e.g., daily via cron job or API route)
 */
export const processAllInvoices = async (): Promise<{
  invoicesProcessed: number;
  statusesUpdated: number;
  payrollsCreated: number;
  errors: string[];
}> => {
  const result = {
    invoicesProcessed: 0,
    statusesUpdated: 0,
    payrollsCreated: 0,
    errors: [] as string[],
  };
  
  try {
    // Get all invoices
    const invoices = await getAllInvoices();
    
    // Get all payrolls to check for existing records
    const payrolls = await getAllPayrolls();
    
    // Process each invoice
    for (const invoice of invoices) {
      try {
        result.invoicesProcessed++;
        
        const processResult = await processInvoiceStatusUpdate(invoice, payrolls);
        
        if (processResult.statusUpdated) {
          result.statusesUpdated++;
        }
        
        if (processResult.payrollCreated) {
          result.payrollsCreated++;
          // Add the new payroll to the list to avoid duplicates
          if (processResult.payrollId) {
            const newPayroll = await import("@/lib/firebase/payroll").then(
              (m) => m.getPayrollById(processResult.payrollId!)
            );
            if (newPayroll) {
              payrolls.push(newPayroll);
            }
          }
        }
      } catch (error: any) {
        const errorMsg = `Error processing invoice ${invoice.invoiceNumber || invoice.id}: ${error.message}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  } catch (error: any) {
    const errorMsg = `Error fetching invoices: ${error.message}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }
  
  return result;
};

/**
 * Process a single invoice (useful when an invoice is created or updated)
 */
export const processSingleInvoice = async (invoiceId: string): Promise<{
  statusUpdated: boolean;
  payrollCreated: boolean;
  payrollId?: string;
}> => {
  try {
    const { getInvoiceById } = await import("@/lib/firebase/invoices");
    const invoice = await getInvoiceById(invoiceId);
    
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    
    const payrolls = await getAllPayrolls();
    return await processInvoiceStatusUpdate(invoice, payrolls);
  } catch (error: any) {
    console.error(`Error processing single invoice ${invoiceId}:`, error);
    throw error;
  }
};

