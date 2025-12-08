export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  type: "text" | "image" | "file" | "profit_update" | "mistake_report";
  attachments?: ChatAttachment[];
  profitData?: ProfitUpdateData;
  mistakeData?: MistakeReportData;
  createdAt: Date;
  updatedAt?: Date;
  readBy?: string[]; // Array of user IDs who have read the message
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "file";
  size: number; // in bytes
  mimeType: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  members: string[]; // Array of user IDs
  memberDetails?: GroupMember[]; // Populated member info
  isPrivate: boolean;
  avatarUrl?: string;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: Date;
  };
  unreadCount?: number;
}

export interface GroupMember {
  uid: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
  avatarUrl?: string;
}

export interface ProfitUpdateData {
  date: string; // ISO date string
  revenue: number;
  expenses: number;
  profit: number;
  revenueBreakdown?: {
    invoices: number;
    other: number;
  };
  expenseBreakdown?: {
    payroll: number;
    other: number;
  };
  notes?: string;
}

export interface MistakeReportData {
  type: "calculation_error" | "data_entry_error" | "missing_data" | "duplicate_entry" | "other";
  description: string;
  affectedAmount?: number;
  affectedDate?: string;
  relatedInvoiceId?: string;
  relatedPayrollId?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "reported" | "investigating" | "resolved" | "dismissed";
}

export interface ChatNotification {
  id: string;
  userId: string;
  groupId: string;
  messageId: string;
  type: "message" | "mention" | "profit_update" | "mistake_report";
  read: boolean;
  createdAt: Date;
}



