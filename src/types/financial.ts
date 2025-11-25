export type PaymentStatus = "pending" | "received" | "overdue";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  siteId: string;
  amount: number;
  gst: number;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  status: PaymentStatus;
  paymentDate?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  totalAmount: number;
  status: PaymentStatus;
  paymentDate?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  salary: number;
  startDate: string;
  status: "active" | "inactive";
  invoiceCollectionFrequency?: "Monthly" | "Fortnightly" | "Weekly";
}

export interface Site {
  id: string;
  name: string;
  address: string;
  clientName: string;
  contactPerson: string;
  contactPhone: string;
  contractValue: number;
  status: "active" | "inactive";
  workingDays?: string[]; // Array of days: ["Monday", "Tuesday", etc.]
  invoicingWorkingHours?: number; // Hours per day for invoicing
  hourlyRate?: number;
  dayRate?: number;
  invoicingFrequency?: "Monthly" | "Fortnightly" | "Weekly";
  specialNote?: string;
}

export interface WorkSchedule {
  id: string;
  siteId: string;
  siteName: string;
  employeeId: string;
  employeeName: string;
  date: string;
  hoursWorked: number;
  notes?: string;
}

export interface WorkHours {
  id: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // Time string (HH:MM format)
  endTime: string; // Time string (HH:MM format)
  hoursWorked: number; // Calculated hours
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Reminder {
  id: string;
  type: "invoice" | "payroll" | "payment";
  title: string;
  description: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed";
  relatedId: string;
}

export interface Client {
  id: string;
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  address?: string;
  contactPerson?: string;
  status: "active" | "inactive";
  notes?: string;
}

export interface EmployeePayRate {
  id: string;
  siteId: string;
  siteName: string;
  employeeId: string;
  employeeName: string;
  hourlyRate: number;
  travelAllowance?: number; // Optional travel allowance
  notes?: string; // For additional notes like "+ 10$ Travel Allowance"
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteEmployeeAllocation {
  id: string;
  siteId: string;
  siteName: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: number; // 1, 2, 3, etc.
  actualWorkingTime: string; // e.g., "3 Hours", "3.5 Hours"
  hasExtraTime: boolean; // Whether employee works extra time
  extraTime?: string; // e.g., "30 minutes", "1 hour"
  extraTimeDay?: string; // Day of week: "Monday", "Tuesday", etc.
  notes?: string; // Additional notes or conditions
  allocatedHours?: string; // Legacy field for backward compatibility
  createdAt?: string;
  updatedAt?: string;
}
