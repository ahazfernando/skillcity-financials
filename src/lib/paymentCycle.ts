/**
 * Calculate payment/due date based on work date and payment cycle
 * Example: Work done in November + 45 days = Payment due on December 15th
 * 
 * @param workDate - The date when work was performed (DD.MM.YYYY format or Date object)
 * @param paymentCycle - Payment cycle in days (default: 45)
 * @returns Payment/due date in DD.MM.YYYY format
 */
export const calculatePaymentDate = (
  workDate: string | Date,
  paymentCycle: number = 45
): string => {
  let date: Date;
  
  // Parse date from DD.MM.YYYY format
  if (typeof workDate === 'string' && workDate.includes('.')) {
    const parts = workDate.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(workDate);
    }
  } else if (typeof workDate === 'string') {
    // ISO format or other string format
    date = new Date(workDate);
  } else {
    date = workDate;
  }
  
  // Add payment cycle days
  const paymentDate = new Date(date);
  paymentDate.setDate(paymentDate.getDate() + paymentCycle);
  
  // Format as DD.MM.YYYY
  const day = String(paymentDate.getDate()).padStart(2, '0');
  const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
  const year = paymentDate.getFullYear();
  
  return `${day}.${month}.${year}`;
};

/**
 * Calculate payment/due date and return as Date object
 * 
 * @param workDate - The date when work was performed (DD.MM.YYYY format or Date object)
 * @param paymentCycle - Payment cycle in days (default: 45)
 * @returns Payment/due date as Date object
 */
export const calculatePaymentDateAsDate = (
  workDate: string | Date,
  paymentCycle: number = 45
): Date => {
  let date: Date;
  
  // Parse date from DD.MM.YYYY format
  if (typeof workDate === 'string' && workDate.includes('.')) {
    const parts = workDate.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(workDate);
    }
  } else if (typeof workDate === 'string') {
    // ISO format or other string format
    date = new Date(workDate);
  } else {
    date = workDate;
  }
  
  // Add payment cycle days
  const paymentDate = new Date(date);
  paymentDate.setDate(paymentDate.getDate() + paymentCycle);
  
  return paymentDate;
};

/**
 * Parse date from DD.MM.YYYY format to Date object
 * 
 * @param dateStr - Date string in DD.MM.YYYY format
 * @returns Date object or null if invalid
 */
export const parseDateFromDDMMYYYY = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return null;
};


