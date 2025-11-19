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
