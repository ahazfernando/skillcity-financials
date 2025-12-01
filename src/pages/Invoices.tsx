"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/SearchFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { Download, Plus, FileText, Calendar as CalendarIcon, Upload, X, Loader2 } from "lucide-react";
import { generateMonthlyReport } from "@/lib/monthly-report-generator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Invoice, PaymentStatus, Employee, PaymentMethod, Payroll, CashFlowMode, CashFlowType } from "@/types/financial";
import { getAllInvoices, addInvoice, updateInvoice } from "@/lib/firebase/invoices";
import { getAllPayrolls, updatePayroll } from "@/lib/firebase/payroll";
import { getAllEmployees, addEmployee } from "@/lib/firebase/employees";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllReminders, addReminder, updateReminder, queryReminders } from "@/lib/firebase/reminders";
import { uploadReceipt } from "@/lib/firebase/storage";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Invoices = () => {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPayrollId, setEditingPayrollId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [employeeSearchValue, setEmployeeSearchValue] = useState("");
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    name: "",
    siteOfWork: "",
    amountExclGst: "",
    gstAmount: "",
    totalAmount: "",
    date: "",
    paymentDate: "",
    status: "pending" as PaymentStatus,
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentReceiptNumber: "",
    notes: "",
    receiptUrl: "",
  });

  const handleInputChange = (field: string, value: string | PaymentMethod) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate GST (10% of amount) and Total if amount changes
      if (field === "amountExclGst" && value) {
        const amountExclGst = parseFloat(value as string) || 0;
        const gst = amountExclGst * 0.10;
        const total = amountExclGst + gst;
        updated.gstAmount = gst.toFixed(2);
        updated.totalAmount = total.toFixed(2);
      }
      
      return updated;
    });
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload PDF, DOCX, JPEG, XLSX, or TXT files.");
      return;
    }
    
    if (file.size > maxSize) {
      alert("File size exceeds 50MB limit.");
      return;
    }
    
    setReceiptFile(file);
    // Optionally create a URL for preview or upload
    const fileUrl = URL.createObjectURL(file);
    handleInputChange("receiptUrl", fileUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    if (receiptFile) {
      // Revoke the object URL if it was created
      if (formData.receiptUrl && formData.receiptUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.receiptUrl);
      }
    }
    setReceiptFile(null);
    handleInputChange("receiptUrl", "");
  };

  // Parse date from DD.MM.YYYY format
  const parseDateFromPayroll = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    return null;
  };

  // Sync reminders for pending/overdue payroll records
  const syncRemindersForPayrolls = useCallback(async (payrolls: Payroll[]) => {
    try {
      const allReminders = await queryReminders({ type: "payroll" });
      const existingReminderMap = new Map(
        allReminders
          .filter(r => r.relatedId) // Filter out any reminders without relatedId
          .map(r => [r.relatedId, r.id] as [string, string])
      );

      for (const payroll of payrolls) {
        // Get the actual status from the payroll record
        const actualStatus = payroll.status;
        
        // Use payment date if available, otherwise use issue date as due date
        const dueDate = payroll.paymentDate 
          ? parseDateFromPayroll(payroll.paymentDate) 
          : parseDateFromPayroll(payroll.date);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Only create reminders for pending or overdue status
        // Use the actual status from the payroll record
        if (actualStatus === "pending" || actualStatus === "overdue") {
          const reminderId = existingReminderMap.get(payroll.id);
          
          // Determine if it's overdue based on actual status
          const isOverdue = actualStatus === "overdue";
          
          // Also check if pending payment has passed its due date
          const isPendingButOverdue = actualStatus === "pending" && 
            dueDate && 
            dueDate < today;

          const priority: "high" | "medium" | "low" = (isOverdue || isPendingButOverdue) ? "high" : "medium";
          const title = (isOverdue || isPendingButOverdue)
            ? `Overdue Payment: ${payroll.name} - ${payroll.invoiceNumber || "N/A"}`
            : `Pending Payment: ${payroll.name} - ${payroll.invoiceNumber || "N/A"}`;
          
          const description = `Payment of $${payroll.totalAmount.toFixed(2)} for ${payroll.name}${payroll.siteOfWork ? ` at ${payroll.siteOfWork}` : ""} is ${(isOverdue || isPendingButOverdue) ? "overdue" : "pending"}.`;

          const reminderData = {
            type: "payroll" as const,
            title,
            description,
            dueDate: dueDate ? dueDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            priority,
            status: "pending" as const,
            relatedId: payroll.id,
          };

          if (reminderId) {
            // Update existing reminder
            await updateReminder(reminderId, reminderData);
          } else {
            // Create new reminder
            await addReminder(reminderData);
          }
        } else if (actualStatus === "received" || actualStatus === "paid") {
          // If status is received/paid, mark related reminder as completed if it exists
          const reminderId = existingReminderMap.get(payroll.id);
          if (reminderId) {
            const existingReminder = allReminders.find(r => r.id === reminderId);
            if (existingReminder && existingReminder.status === "pending") {
              await updateReminder(reminderId, { status: "completed" });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error syncing reminders:", error);
      // Don't show error toast as this runs in background
    }
  }, []);

  // Load payroll data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setIsLoadingEmployees(true);
        const [fetchedPayrolls, fetchedEmployees, fetchedSites] = await Promise.all([
          getAllPayrolls(),
          getAllEmployees(),
          getAllSites(),
        ]);
        setPayrolls(fetchedPayrolls);
        setEmployees(fetchedEmployees.filter(emp => emp.status === "active"));
        setSites(fetchedSites.filter(s => s.status === "active"));
        
        // Sync reminders for pending/overdue records
        await syncRemindersForPayrolls(fetchedPayrolls);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
        setIsLoadingEmployees(false);
      }
    };

    loadData();
  }, [syncRemindersForPayrolls]);

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setFormData((prev) => ({
        ...prev,
        name: employee.name,
      }));
      setEmployeePopoverOpen(false);
      setEmployeeSearchValue("");
    }
  };

  const handleAddNewEmployee = async (name: string) => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    // Check if employee already exists
    const existingEmployee = employees.find(
      emp => emp.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingEmployee) {
      handleEmployeeSelect(existingEmployee.id);
      return;
    }

    try {
      setIsAddingEmployee(true);
      const newEmployeeId = await addEmployee({
        name: name.trim(),
        role: "",
        email: "",
        phone: "",
        salary: 0,
        startDate: new Date().toISOString().split('T')[0],
        status: "active",
      });

      // Reload employees list
      const updatedEmployees = await getAllEmployees();
      setEmployees(updatedEmployees.filter(emp => emp.status === "active"));

      // Select the newly added employee
      setFormData((prev) => ({
        ...prev,
        name: name.trim(),
      }));
      setEmployeePopoverOpen(false);
      setEmployeeSearchValue("");
      toast.success(`Employee "${name.trim()}" added successfully!`);
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error("Failed to add employee. Please try again.");
    } finally {
      setIsAddingEmployee(false);
    }
  };

  // Convert DD.MM.YYYY to YYYY-MM-DD for date inputs
  const convertDateToInputFormat = (dateStr: string): string => {
    if (!dateStr) return "";
    // If already in DD.MM.YYYY format, convert to YYYY-MM-DD
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    // If already in YYYY-MM-DD format, return as is
    if (dateStr.includes('-') && dateStr.length === 10) {
      return dateStr;
    }
    return "";
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: "",
      name: "",
      siteOfWork: "",
      amountExclGst: "",
      gstAmount: "",
      totalAmount: "",
      date: "",
      paymentDate: "",
      status: "pending",
      paymentMethod: "bank_transfer",
      paymentReceiptNumber: "",
      notes: "",
      receiptUrl: "",
    });
    setReceiptFile(null);
    setEditingPayrollId(null);
    setEmployeePopoverOpen(false);
    setEmployeeSearchValue("");
  };

  const handleEditPayroll = (payroll: Payroll) => {
    setEditingPayrollId(payroll.id);
    setFormData({
      invoiceNumber: payroll.invoiceNumber || "",
      name: payroll.name,
      siteOfWork: payroll.siteOfWork || "",
      amountExclGst: payroll.amountExclGst.toString(),
      gstAmount: payroll.gstAmount.toString(),
      totalAmount: payroll.totalAmount.toString(),
      date: convertDateToInputFormat(payroll.date),
      paymentDate: payroll.paymentDate ? convertDateToInputFormat(payroll.paymentDate) : "",
      status: payroll.status,
      paymentMethod: payroll.paymentMethod,
      paymentReceiptNumber: payroll.paymentReceiptNumber || "",
      notes: payroll.notes || "",
      receiptUrl: payroll.receiptUrl || "",
    });
    setReceiptFile(null);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePayroll = async () => {
    if (!editingPayrollId) return;
    
    if (!formData.name || !formData.date || !formData.amountExclGst) {
      toast.error("Please fill in all required fields (Name, Date, Amount)");
      return;
    }

    try {
      setIsSaving(true);
      
      // Convert date from YYYY-MM-DD to DD.MM.YYYY format
      const dateParts = formData.date.split('-');
      const formattedDate = dateParts.length === 3 
        ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`
        : formData.date;

      // Convert payment date from YYYY-MM-DD to DD.MM.YYYY format if provided
      let formattedPaymentDate = undefined;
      if (formData.paymentDate) {
        const paymentDateParts = formData.paymentDate.split('-');
        formattedPaymentDate = paymentDateParts.length === 3 
          ? `${paymentDateParts[2]}.${paymentDateParts[1]}.${paymentDateParts[0]}`
          : formData.paymentDate;
      }

      const updatedPayroll: Partial<Omit<Payroll, "id">> = {
        invoiceNumber: formData.invoiceNumber || undefined,
        name: formData.name,
        siteOfWork: formData.siteOfWork || undefined,
        amountExclGst: parseFloat(formData.amountExclGst) || 0,
        gstAmount: parseFloat(formData.gstAmount) || 0,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        date: formattedDate,
        paymentMethod: formData.paymentMethod,
        paymentDate: formattedPaymentDate,
        paymentReceiptNumber: formData.paymentReceiptNumber || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      await updatePayroll(editingPayrollId, updatedPayroll);
      
      // Reload payrolls
      const updatedPayrolls = await getAllPayrolls();
      setPayrolls(updatedPayrolls);
      
      // Sync reminders after update
      await syncRemindersForPayrolls(updatedPayrolls);
      
      toast.success("Record updated successfully!");
      setIsEditDialogOpen(false);
      setReceiptFile(null);
      setEmployeePopoverOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating record:", error);
      toast.error("Failed to update record. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };



  // Convert DD.MM.YYYY to Date object
  const parseDate = (dateStr: string): Date | null => {
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

  // Format date from DD.MM.YYYY or ISO to display format
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    // If already in DD.MM.YYYY format, return as is
    if (dateStr.includes('.')) return dateStr;
    // Otherwise convert from ISO (YYYY-MM-DD) to DD.MM.YYYY
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  };

  const filteredPayrolls = payrolls.filter(payroll => {
    const matchesSearch = payroll.invoiceNumber?.toLowerCase().includes(searchValue.toLowerCase()) ||
      payroll.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (payroll.siteOfWork && payroll.siteOfWork.toLowerCase().includes(searchValue.toLowerCase()));
    const matchesStatus = statusFilter === "all" || payroll.status === statusFilter;
    
    // Date range filtering
    let matchesDate = true;
    if (dateRange?.from || dateRange?.to) {
      const payrollDate = parseDate(payroll.date);
      if (payrollDate) {
        if (dateRange.from && dateRange.to) {
          matchesDate = payrollDate >= dateRange.from && payrollDate <= dateRange.to;
        } else if (dateRange.from) {
          matchesDate = payrollDate >= dateRange.from;
        } else if (dateRange.to) {
          matchesDate = payrollDate <= dateRange.to;
        }
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage client invoices and payments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const monthLabel = dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                  : dateRange?.from
                  ? format(dateRange.from, "MMMM yyyy")
                  : new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
                
                await generateMonthlyReport(filteredPayrolls, monthLabel, "/logo/skillcityyy.png");
                toast.success("Monthly report downloaded successfully!");
              } catch (error: any) {
                console.error("Error generating report:", error);
                toast.error(error.message || "Failed to generate report. Please try again.");
              }
            }}
            disabled={isLoading || filteredPayrolls.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Monthly Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap items-end mb-6">
            <div className="flex-1 min-w-[200px]">
              <SearchFilter
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                placeholder="Search by invoice number or client..."
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50 dark:bg-green-950">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Site of Work</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredPayrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayrolls.map((payroll) => (
                    <TableRow 
                      key={payroll.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditPayroll(payroll)}
                    >
                      <TableCell className="font-medium">{payroll.invoiceNumber || "-"}</TableCell>
                      <TableCell className="font-medium">{payroll.name || "-"}</TableCell>
                      <TableCell>{payroll.siteOfWork || "-"}</TableCell>
                      <TableCell>${payroll.amountExclGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>${payroll.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="font-semibold">${payroll.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>{formatDate(payroll.date)}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <StatusBadge status={payroll.status} />
                      </TableCell>
                      <TableCell>
                        {payroll.paymentMethod ? (
                          <Badge variant="outline">
                            {payroll.paymentMethod === "bank_transfer" ? "Bank Transfer" :
                             payroll.paymentMethod === "cash" ? "Cash" :
                             payroll.paymentMethod === "cheque" ? "Cheque" :
                             payroll.paymentMethod === "credit_card" ? "Credit Card" : "Other"}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{payroll.paymentDate ? formatDate(payroll.paymentDate) : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/InvoiceField.jpg"
                alt="Edit Invoice"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-8">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <img
                    src="/logo/SkillCityQ 1.png"
                    alt="Skill City Logo"
                    className="w-32 h-20 object-contain"
                  />
                  <h2 className="text-2xl font-semibold text-white">
                    Edit financial invoice
                  </h2>
                  <p className="text-sm text-white">
                    Update the invoice details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Edit Record</DialogTitle>
                  <DialogDescription>
                    Update the record details. All fields matching the table columns are available.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-invoiceNumber">Invoice # *</Label>
                <Input
                  id="edit-invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                  placeholder="INV-2025-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeePopoverOpen}
                      className="w-full justify-between"
                      disabled={isLoadingEmployees}
                    >
                      {formData.name || "Select employee..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search employee..." 
                        value={employeeSearchValue}
                        onValueChange={setEmployeeSearchValue}
                      />
                      <CommandList>
                        {isLoadingEmployees ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Loading...</span>
                          </div>
                        ) : (
                          <>
                            <CommandGroup>
                              {employees
                                .filter(employee => 
                                  !employeeSearchValue || 
                                  employee.name.toLowerCase().includes(employeeSearchValue.toLowerCase())
                                )
                                .map((employee) => (
                                  <CommandItem
                                    key={employee.id}
                                    value={employee.name}
                                    onSelect={() => handleEmployeeSelect(employee.id)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.name === employee.name
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {employee.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                            {employeeSearchValue && 
                             !employees.some(emp => 
                               emp.name.toLowerCase() === employeeSearchValue.trim().toLowerCase()
                             ) && 
                             employeeSearchValue.trim().length > 0 && (
                              <CommandGroup>
                                <CommandItem
                                  value={`add-${employeeSearchValue}`}
                                  onSelect={() => handleAddNewEmployee(employeeSearchValue)}
                                  disabled={isAddingEmployee}
                                  className="text-primary"
                                >
                                  {isAddingEmployee ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="mr-2 h-4 w-4" />
                                      Add "{employeeSearchValue}"
                                    </>
                                  )}
                                </CommandItem>
                              </CommandGroup>
                            )}
                            {!employeeSearchValue && employees.length === 0 && (
                              <CommandEmpty>No employees found.</CommandEmpty>
                            )}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-siteOfWork">Site of Work</Label>
                <Select
                  value={formData.siteOfWork}
                  onValueChange={(value) => handleInputChange("siteOfWork", value)}
                >
                  <SelectTrigger id="edit-siteOfWork">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.name}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amountExclGst">Amount (Excl. GST) *</Label>
                <Input
                  id="edit-amountExclGst"
                  type="number"
                  step="0.01"
                  value={formData.amountExclGst}
                  onChange={(e) => handleInputChange("amountExclGst", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gstAmount">GST Amount (10%)</Label>
                <Input
                  id="edit-gstAmount"
                  type="number"
                  step="0.01"
                  value={formData.gstAmount}
                  readOnly
                  className="bg-muted"
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-totalAmount">Total Amount</Label>
                <Input
                  id="edit-totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  readOnly
                  className="bg-muted"
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Issue Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-paymentDate">Payment Date</Label>
                <Input
                  id="edit-paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleInputChange("paymentMethod", value)}
                >
                  <SelectTrigger id="edit-paymentMethod">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-paymentReceiptNumber">Payment Receipt Number</Label>
                <Input
                  id="edit-paymentReceiptNumber"
                  value={formData.paymentReceiptNumber}
                  onChange={(e) => handleInputChange("paymentReceiptNumber", e.target.value)}
                  placeholder="Receipt number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload Receipt</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !receiptFile && document.getElementById('edit-receipt-upload')?.click()}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                  ${receiptFile ? 'border-primary/50' : ''}
                  ${!receiptFile ? 'cursor-pointer hover:border-primary/50' : ''}
                `}
              >
                <input
                  type="file"
                  id="edit-receipt-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpeg,.jpg,.png,.xlsx,.xls,.txt"
                  onChange={handleFileInputChange}
                />
                {receiptFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-primary flex-shrink-0" />
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <p className="text-sm font-medium truncate w-full">{receiptFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('edit-receipt-upload')?.click();
                      }}
                    >
                      Change File
                    </Button>
                  </div>
                ) : formData.receiptUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-primary flex-shrink-0" />
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <p className="text-sm font-medium">Existing receipt</p>
                        <p className="text-xs text-muted-foreground">
                          Click to upload a new file
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('edit-receipt-upload')?.click();
                      }}
                    >
                      Replace Receipt
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Choose a file or drag & drop it here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOCX, JPEG, XLSX, TXT - Up to 50MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('edit-receipt-upload')?.click()}
                    >
                      Browse files
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes about the invoice..."
                rows={3}
              />
            </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePayroll} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Record"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
