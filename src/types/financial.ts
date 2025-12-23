export type PaymentStatus = "pending" | "received" | "paid" | "overdue" | "late";
export type PayrollFrequency = "Weekly" | "Fortnightly" | "Monthly";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  name?: string; // Employee or person name (similar to payroll)
  siteId: string;
  siteOfWork?: string; // Site name or location
  amount: number;
  gst: number;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  status: PaymentStatus;
  paymentDate?: string;
  paymentMethod?: PaymentMethod; // Payment method
  paymentReceiptNumber?: string; // Receipt number
  receiptUrl?: string;
  notes?: string;
}

export type CashFlowMode = "inflow" | "outflow";
export type CashFlowType = "invoice" | "internal_payroll" | "cleaner_payroll";
export type PaymentMethod = "bank_transfer" | "cash" | "cheque" | "credit_card" | "other";

export interface Payroll {
  id: string;
  month: string; // e.g., "November"
  date: string; // Date in DD.MM.YYYY format
  modeOfCashFlow: CashFlowMode; // "inflow" or "outflow"
  typeOfCashFlow: CashFlowType; // "invoice", "internal_payroll", "cleaner_payroll"
  name: string; // Employee or client name
  siteOfWork?: string; // Site name or location
  abnRegistered: boolean; // ABN registration status
  gstRegistered: boolean; // GST registration status
  invoiceNumber?: string; // Invoice number for inflows, "N/A" for outflows
  amountExclGst: number; // Amount excluding GST
  gstAmount: number; // GST amount (10% of amountExclGst)
  totalAmount: number; // Total amount including GST
  currency: string; // Currency code (e.g., "AUD", "USD", etc.)
  paymentMethod: PaymentMethod; // Payment method
  paymentDate?: string; // Payment credited/received date
  paymentReceiptNumber?: string; // Receipt number
  status: PaymentStatus; // "pending", "received", "paid", "overdue", "late"
  notes?: string; // Additional notes
  frequency?: PayrollFrequency; // "Weekly", "Fortnightly", "Monthly"
  paymentCycle?: number; // Payment cycle in days (default: 45)
  attachedFiles?: string[]; // Array of file URLs
  // Legacy fields for backward compatibility
  employeeId?: string;
  employeeName?: string;
  period?: string;
  basicSalary?: number;
  allowances?: number;
  deductions?: number;
  receiptUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  movedToHistoryAt?: string; // Date when invoice was moved to history (ISO string)
}

export type EmployeeType = "employee" | "client";

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  salary: number;
  startDate: string;
  status: "active" | "inactive";
  invoiceCollectionFrequency?: ("Monthly" | "Fortnightly" | "Weekly")[];
  type?: EmployeeType; // "employee" or "client" - defaults to "employee" for backward compatibility
  isSkillCityEmployee?: boolean; // true if employee works for Skill City organization, false for external employees
  abnRegistered?: boolean; // ABN registration status
  gstRegistered?: boolean; // GST registration status
  applyGst?: boolean; // Whether to calculate GST for this employee (if false, GST will not be calculated)
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
  latitude?: number; // Location latitude
  longitude?: number; // Location longitude
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
  currency?: "LKR" | "AUD"; // Currency for the pay rate
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

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string; // DD.MM.YYYY format
  paymentMethod: PaymentMethod;
  vendor?: string; // Vendor or supplier name
  receiptUrl?: string; // Receipt/document URL
  notes?: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string; // User ID who approved
  approvedAt?: string; // Approval date
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseCategory = 
  | "office_supplies"
  | "equipment"
  | "travel"
  | "utilities"
  | "rent"
  | "marketing"
  | "professional_services"
  | "insurance"
  | "maintenance"
  | "other";

export interface ActivityLog {
  id: string;
  type: ActivityType;
  action: string; // e.g., "Created invoice", "Updated employee"
  description: string;
  userId: string;
  userName: string;
  entityType?: string; // "invoice", "employee", "payroll", etc.
  entityId?: string;
  metadata?: Record<string, any>; // Additional data
  timestamp: string;
  ipAddress?: string;
}

export type ActivityType = 
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "login"
  | "logout"
  | "approve"
  | "reject"
  | "payment";

export interface WorkRecord {
  id: string;
  employeeId: string; // Firebase Auth UID
  employeeName: string;
  siteId?: string;
  siteName?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  clockInTime: string; // ISO timestamp
  clockOutTime?: string; // ISO timestamp
  hoursWorked: number; // Calculated hours
  isWeekend: boolean; // Whether the date falls on a weekend
  isLeave?: boolean; // Whether this is a leave day
  leaveType?: "Annual" | "Sick" | "Casual" | "Unpaid"; // Type of leave if isLeave is true
  approvalStatus: "pending" | "approved" | "rejected"; // Approval status
  approvedBy?: string; // User ID who approved
  approvedAt?: string; // Approval timestamp
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankDetails {
  id: string;
  employeeId: string; // Firebase Auth UID
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  branch: string;
  idNumber?: string; // Optional ID/NIC number
  swiftCode?: string; // Optional SWIFT/BIC code
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string; // Firebase Auth UID
  employeeName: string;
  leaveType: "Annual" | "Sick" | "Casual" | "Unpaid";
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  reason?: string; // Optional reason/notes
  status: "pending" | "approved" | "rejected";
  approvedBy?: string; // User ID who approved/rejected
  approvedAt?: string; // Approval/rejection timestamp
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "new" | "in_progress" | "completed";
  priority: "low" | "mid" | "high";
  siteId?: string;
  siteName?: string;
  assignedTo: string[]; // Array of employee/user IDs
  assignedToNames?: string[]; // Array of employee/user names for display
  deadline?: string; // ISO date string (YYYY-MM-DD)
  subtasks?: Subtask[];
  location?: string;
  payRate?: number; // Fetched from site when siteId is selected
  totalHours?: number; // Fetched from site when siteId is selected
  completedImages?: string[]; // Array of image URLs
  progress: number; // 0-10 or 0-100
  category?: string; // e.g., "Design", "Dev", "Research", "Content", "Planning"
  createdBy: string; // User ID who created the task
  createdByName?: string; // Name of user who created the task
  createdAt: string;
  updatedAt: string;
  startedAt?: string; // ISO date string - when task was moved to "in_progress"
  completedAt?: string; // ISO date string - when task was moved to "completed"
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface CleaningTrackerEntry {
  id: string;
  workId: number; // Sequential work ID
  month: string; // e.g., "November"
  workDate: string; // ISO date string (YYYY-MM-DD)
  siteName: string;
  cleaners: CleaningTrackerCleaner[]; // Multiple cleaners per entry
  createdAt: string;
  updatedAt: string;
}

export interface CleaningTrackerCleaner {
  cleanerName: string;
  workedHours: number; // e.g., 2.25, 3, 2.5
  serviceCharge: number; // Currency amount
  specialNotes?: string; // Optional notes
  photosUploaded: boolean; // Whether photos were uploaded
}
