import { Invoice, Payroll, Employee, Site, WorkSchedule, Reminder } from "@/types/financial";

export const mockInvoices: Invoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "INV-2025-001",
    clientName: "ABC Corporation",
    siteId: "site-001",
    amount: 5000,
    gst: 750,
    totalAmount: 5750,
    issueDate: "2025-01-01",
    dueDate: "2025-01-31",
    status: "received",
    paymentDate: "2025-01-25",
    receiptUrl: "/receipts/inv-001.pdf",
    notes: "Regular monthly cleaning service"
  },
  {
    id: "inv-002",
    invoiceNumber: "INV-2025-002",
    clientName: "XYZ Ltd",
    siteId: "site-002",
    amount: 3500,
    gst: 525,
    totalAmount: 4025,
    issueDate: "2025-01-05",
    dueDate: "2025-02-05",
    status: "pending",
    notes: "Deep cleaning service"
  },
  {
    id: "inv-003",
    invoiceNumber: "INV-2025-003",
    clientName: "Tech Solutions",
    siteId: "site-003",
    amount: 4200,
    gst: 630,
    totalAmount: 4830,
    issueDate: "2024-12-20",
    dueDate: "2025-01-20",
    status: "overdue",
    notes: "Office cleaning - quarterly"
  },
];

export const mockPayrolls: Payroll[] = [
  {
    id: "pay-001",
    employeeId: "emp-001",
    employeeName: "John Smith",
    period: "January 2025",
    basicSalary: 3000,
    allowances: 500,
    deductions: 200,
    totalAmount: 3300,
    status: "received",
    paymentDate: "2025-01-31",
    receiptUrl: "/receipts/pay-001.pdf",
    notes: "Regular monthly salary"
  },
  {
    id: "pay-002",
    employeeId: "emp-002",
    employeeName: "Sarah Johnson",
    period: "January 2025",
    basicSalary: 2800,
    allowances: 400,
    deductions: 150,
    totalAmount: 3050,
    status: "pending",
    notes: "Includes overtime pay"
  },
  {
    id: "pay-003",
    employeeId: "emp-003",
    employeeName: "Mike Davis",
    period: "January 2025",
    basicSalary: 2500,
    allowances: 300,
    deductions: 100,
    totalAmount: 2700,
    status: "pending",
  },
];

export const mockEmployees: Employee[] = [
  {
    id: "emp-001",
    name: "John Smith",
    role: "Senior Cleaner",
    email: "john.smith@example.com",
    phone: "+1234567890",
    salary: 3000,
    startDate: "2023-01-15",
    status: "active"
  },
  {
    id: "emp-002",
    name: "Sarah Johnson",
    role: "Cleaning Supervisor",
    email: "sarah.j@example.com",
    phone: "+1234567891",
    salary: 2800,
    startDate: "2023-03-20",
    status: "active"
  },
  {
    id: "emp-003",
    name: "Mike Davis",
    role: "Cleaner",
    email: "mike.d@example.com",
    phone: "+1234567892",
    salary: 2500,
    startDate: "2024-06-01",
    status: "active"
  },
];

export const mockSites: Site[] = [
  {
    id: "site-001",
    name: "ABC Corporation HQ",
    address: "123 Business St, City",
    clientName: "ABC Corporation",
    contactPerson: "Jane Doe",
    contactPhone: "+1234567893",
    contractValue: 60000,
    status: "active"
  },
  {
    id: "site-002",
    name: "XYZ Ltd Office",
    address: "456 Commerce Ave, City",
    clientName: "XYZ Ltd",
    contactPerson: "Bob Wilson",
    contactPhone: "+1234567894",
    contractValue: 42000,
    status: "active"
  },
  {
    id: "site-003",
    name: "Tech Solutions Campus",
    address: "789 Innovation Blvd, City",
    clientName: "Tech Solutions",
    contactPerson: "Alice Brown",
    contactPhone: "+1234567895",
    contractValue: 50400,
    status: "active"
  },
];

export const mockWorkSchedules: WorkSchedule[] = [
  {
    id: "ws-001",
    siteId: "site-001",
    siteName: "ABC Corporation HQ",
    employeeId: "emp-001",
    employeeName: "John Smith",
    date: "2025-01-15",
    hoursWorked: 8,
    notes: "Regular cleaning"
  },
  {
    id: "ws-002",
    siteId: "site-002",
    siteName: "XYZ Ltd Office",
    employeeId: "emp-002",
    employeeName: "Sarah Johnson",
    date: "2025-01-15",
    hoursWorked: 6,
    notes: "Deep cleaning session"
  },
];

export const mockReminders: Reminder[] = [
  {
    id: "rem-001",
    type: "invoice",
    title: "Invoice Overdue",
    description: "INV-2025-003 from Tech Solutions is overdue",
    dueDate: "2025-01-20",
    priority: "high",
    status: "pending",
    relatedId: "inv-003"
  },
  {
    id: "rem-002",
    type: "payroll",
    title: "Payroll Due",
    description: "January 2025 payroll payment due",
    dueDate: "2025-01-31",
    priority: "high",
    status: "pending",
    relatedId: "pay-002"
  },
  {
    id: "rem-003",
    type: "invoice",
    title: "Invoice Due Soon",
    description: "INV-2025-002 payment due in 5 days",
    dueDate: "2025-02-05",
    priority: "medium",
    status: "pending",
    relatedId: "inv-002"
  },
];
