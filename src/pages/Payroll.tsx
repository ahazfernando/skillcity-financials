"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/SearchFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, FileText, X, Loader2, Check, ChevronsUpDown, Search, Edit2, LayoutGrid, Table as TableIcon, CalendarIcon, TrendingUp, TrendingDown, DollarSign, Trash2, Upload, File } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, formatCurrency } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, LabelList } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PaymentStatus, Employee, CashFlowMode, CashFlowType, PaymentMethod, PayrollFrequency, type Payroll } from "@/types/financial";
import { getAllEmployees, addEmployee } from "@/lib/firebase/employees";
import { getAllPayrolls, addPayroll, updatePayroll, deletePayroll } from "@/lib/firebase/payroll";
import { getAllSites } from "@/lib/firebase/sites";
import { toast } from "sonner";
import { calculatePaymentDate } from "@/lib/paymentCycle";

const Payroll = () => {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState<"all" | "inflow" | "outflow">("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPayrollId, setEditingPayrollId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [employeeSearchValue, setEmployeeSearchValue] = useState("");
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
  const [formMonthPopoverOpen, setFormMonthPopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payrollToDelete, setPayrollToDelete] = useState<Payroll | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().toLocaleString('default', { month: 'long' }),
    date: new Date().toISOString().split('T')[0],
    modeOfCashFlow: "outflow" as CashFlowMode,
    typeOfCashFlow: "cleaner_payroll" as CashFlowType,
    name: "",
    siteOfWork: "",
    abnRegistered: false,
    gstRegistered: false,
    invoiceNumber: "",
    amountExclGst: "",
    gstAmount: "",
    totalAmount: "",
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: "",
    paymentReceiptNumber: "",
    status: "pending" as PaymentStatus,
    notes: "",
    receiptUrl: "",
    frequency: "Monthly" as PayrollFrequency,
    paymentCycle: 45,
    attachedFiles: [] as string[],
  });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Helper function to deduplicate employees
  // Removes duplicates based on normalized name (case-insensitive, trimmed)
  // Keeps the first occurrence of each unique name
  const deduplicateEmployees = (employees: Employee[]): Employee[] => {
    const seenByName = new Map<string, Employee>();
    
    for (const employee of employees) {
      // Normalize name: lowercase, trim, remove extra spaces
      const normalizedName = employee.name.toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Only keep the first occurrence of each normalized name
      if (!seenByName.has(normalizedName)) {
        seenByName.set(normalizedName, employee);
      }
    }
    
    return Array.from(seenByName.values());
  };

  // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setIsLoadingEmployees(true);
        
        // Process all invoices to update statuses and create payroll records
        // This ensures any existing invoices are processed
        try {
          const processResponse = await fetch("/api/process-invoices", {
            method: "GET",
          });
          if (processResponse.ok) {
            const result = await processResponse.json();
            if (result.payrollsCreated > 0 || result.statusesUpdated > 0) {
              console.log(`Processed invoices: ${result.statusesUpdated} statuses updated, ${result.payrollsCreated} payrolls created`);
            }
          }
        } catch (error) {
          console.error("Error processing invoices:", error);
          // Don't block the UI if this fails
        }
        
        const [fetchedPayrolls, fetchedEmployees, fetchedSites] = await Promise.all([
          getAllPayrolls(),
          getAllEmployees(),
          getAllSites(),
        ]);
        setPayrolls(fetchedPayrolls);
        // Filter out clients and inactive employees, then deduplicate
        const filteredEmployees = fetchedEmployees.filter(emp => emp.status === "active" && (!emp.type || emp.type === "employee"));
        setEmployees(deduplicateEmployees(filteredEmployees));
        setSites(fetchedSites.filter(s => s.status === "active"));
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
        setIsLoadingEmployees(false);
      }
    };

    loadData();
  }, []);

  // Calculate payment status based on payment cycle
  // On the paymentCycle day (e.g., 45th day): pending
  // Starting from paymentCycle + 1 day (e.g., 46th day): overdue
  const calculatePaymentStatus = (date: string, paymentCycle: number): PaymentStatus => {
    if (!date) return "pending";
    
    const payrollDate = new Date(date);
    const today = new Date();
    // Set time to midnight for accurate day calculation
    payrollDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - payrollDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < paymentCycle) {
      return "pending";
    } else if (daysDiff === paymentCycle) {
      return "pending";
    } else {
      // From day 46 onwards, status is overdue
      return "overdue";
    }
  };

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate GST (10%) and Total = Amount (Excl. GST) + GST
      if (field === "amountExclGst") {
        const amountExclGst = parseFloat(value as string) || 0;
        const gst = amountExclGst * 0.10; // 10% GST
        const total = amountExclGst + gst;
        updated.gstAmount = gst.toFixed(2);
        updated.totalAmount = total.toFixed(2);
      }
      
      // Auto-calculate status and payment date based on payment cycle when date or paymentCycle changes
      if (field === "date" || field === "paymentCycle") {
        const date = field === "date" ? (value as string) : updated.date;
        const cycle = field === "paymentCycle" ? (value as number) : updated.paymentCycle;
        if (date && cycle) {
          updated.status = calculatePaymentStatus(date, cycle);
          // Auto-calculate payment date: work date + payment cycle (only if payment date not manually set)
          if (date && !updated.paymentDate) {
            try {
              // Convert date to DD.MM.YYYY if needed
              let dateStr = date;
              if (date.includes('-')) {
                // Convert from YYYY-MM-DD to DD.MM.YYYY
                const parts = date.split('-');
                if (parts.length === 3) {
                  dateStr = `${parts[2]}.${parts[1]}.${parts[0]}`;
                }
              }
              updated.paymentDate = calculatePaymentDate(dateStr, cycle);
            } catch (error) {
              console.error("Error calculating payment date:", error);
            }
          }
        }
      }
      
      return updated;
    });
  };

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
      const filteredEmployees = updatedEmployees.filter(emp => emp.status === "active" && (!emp.type || emp.type === "employee"));
      setEmployees(deduplicateEmployees(filteredEmployees));

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

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PDF, DOCX, JPEG, XLSX, or TXT files.");
      return;
    }
    
    if (file.size > maxSize) {
      toast.error("File size exceeds 50MB limit.");
      return;
    }
    
    // Add to attached files array
    setAttachedFiles((prev) => [...prev, file]);
    const fileUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      attachedFiles: [...prev.attachedFiles, fileUrl],
    }));
  };

  const handleRemoveAttachedFile = (index: number) => {
    setAttachedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      return newFiles;
    });
    setFormData((prev) => {
      const newUrls = prev.attachedFiles.filter((_, i) => i !== index);
      // Revoke blob URL if it exists
      if (prev.attachedFiles[index]?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.attachedFiles[index]);
      }
      return { ...prev, attachedFiles: newUrls };
    });
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
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      handleFileSelect(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        handleFileSelect(file);
      });
    }
  };

  const handleRemoveFile = () => {
    if (receiptFile) {
      if (formData.receiptUrl && formData.receiptUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.receiptUrl);
      }
    }
    setReceiptFile(null);
    handleInputChange("receiptUrl", "");
  };

  const handleAddPayroll = async () => {
    // Allow partial filling - no strict validation required
    // Only show a warning if absolutely no data is provided
    if (!formData.name && !formData.date && !formData.amountExclGst && !formData.notes) {
      toast.warning("Please fill in at least one field to save the payroll entry");
      return;
    }

    try {
      setIsSaving(true);
      
      // Convert date from YYYY-MM-DD to DD.MM.YYYY format (use today's date if not provided)
      let formattedDate = "";
      if (formData.date) {
        const dateParts = formData.date.split('-');
        formattedDate = dateParts.length === 3 
          ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`
          : formData.date;
      } else {
        // Use today's date as default if not provided
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        formattedDate = `${day}.${month}.${year}`;
      }

      // Convert payment date from YYYY-MM-DD to DD.MM.YYYY format if provided
      let formattedPaymentDate = undefined;
      if (formData.paymentDate) {
        const paymentDateParts = formData.paymentDate.split('-');
        formattedPaymentDate = paymentDateParts.length === 3 
          ? `${paymentDateParts[2]}.${paymentDateParts[1]}.${paymentDateParts[0]}`
          : formData.paymentDate;
      }

      // Calculate status based on payment cycle if date is provided, otherwise use 'pending'
      const calculatedStatus = formData.date 
        ? calculatePaymentStatus(formData.date, formData.paymentCycle)
        : "pending";
      
      const newPayroll: Omit<Payroll, "id"> = {
        month: formData.month || new Date().toLocaleString('default', { month: 'long' }),
        date: formattedDate,
        modeOfCashFlow: formData.modeOfCashFlow,
        typeOfCashFlow: formData.typeOfCashFlow,
        name: formData.name || "Unnamed",
        siteOfWork: formData.siteOfWork || undefined,
        abnRegistered: formData.abnRegistered,
        gstRegistered: formData.gstRegistered,
        invoiceNumber: formData.invoiceNumber || undefined,
        amountExclGst: parseFloat(formData.amountExclGst) || 0,
        gstAmount: parseFloat(formData.gstAmount) || 0,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        paymentDate: formattedPaymentDate,
        paymentReceiptNumber: formData.paymentReceiptNumber || undefined,
        status: calculatedStatus,
        notes: formData.notes || undefined,
        frequency: formData.frequency,
        paymentCycle: formData.paymentCycle,
        attachedFiles: formData.attachedFiles.length > 0 ? formData.attachedFiles : undefined,
      };

      await addPayroll(newPayroll);
      
      // Reload payrolls
      const updatedPayrolls = await getAllPayrolls();
      setPayrolls(updatedPayrolls);
      
      toast.success("Payroll added successfully!");
      setIsAddDialogOpen(false);
      setReceiptFile(null);
      setAttachedFiles([]);
      setEmployeePopoverOpen(false);
      setEditingPayrollId(null);
      resetForm();
    } catch (error) {
      console.error("Error adding payroll:", error);
      toast.error("Failed to add payroll. Please try again.");
    } finally {
      setIsSaving(false);
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
    // Revoke all blob URLs
    formData.attachedFiles.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    setFormData({
      month: new Date().toLocaleString('default', { month: 'long' }),
      date: new Date().toISOString().split('T')[0],
      modeOfCashFlow: "outflow",
      typeOfCashFlow: "cleaner_payroll",
      name: "",
      siteOfWork: "",
      abnRegistered: false,
      gstRegistered: false,
      invoiceNumber: "",
      amountExclGst: "",
      gstAmount: "",
      totalAmount: "",
      currency: "AUD",
      paymentMethod: "bank_transfer",
      paymentDate: "",
      paymentReceiptNumber: "",
      status: "pending",
      notes: "",
      receiptUrl: "",
      frequency: "Monthly",
      paymentCycle: 45,
      attachedFiles: [],
    });
    setAttachedFiles([]);
    setEditingPayrollId(null);
  };

  const handleEditPayroll = (payroll: Payroll) => {
    setEditingPayrollId(payroll.id);
    setFormData({
      month: payroll.month,
      date: convertDateToInputFormat(payroll.date),
      modeOfCashFlow: payroll.modeOfCashFlow,
      typeOfCashFlow: payroll.typeOfCashFlow,
      name: payroll.name,
      siteOfWork: payroll.siteOfWork || "",
      abnRegistered: payroll.abnRegistered,
      gstRegistered: payroll.gstRegistered,
      invoiceNumber: payroll.invoiceNumber || "",
      amountExclGst: payroll.amountExclGst.toString(),
      gstAmount: payroll.gstAmount.toString(),
      totalAmount: payroll.totalAmount.toString(),
      currency: payroll.currency,
      paymentMethod: payroll.paymentMethod,
      paymentDate: payroll.paymentDate ? convertDateToInputFormat(payroll.paymentDate) : "",
      paymentReceiptNumber: payroll.paymentReceiptNumber || "",
      status: payroll.status,
      notes: payroll.notes || "",
      receiptUrl: payroll.receiptUrl || "",
      frequency: payroll.frequency || "Monthly",
      paymentCycle: payroll.paymentCycle || 45,
      attachedFiles: payroll.attachedFiles || [],
    });
    setAttachedFiles([]); // Reset file array for editing
    setIsAddDialogOpen(true);
  };

  const handleUpdatePayroll = async () => {
    if (!editingPayrollId) return;
    
    // Allow partial filling - no strict validation required for updates
    try {
      setIsSaving(true);
      
      // Convert date from YYYY-MM-DD to DD.MM.YYYY format (preserve existing if not provided)
      let formattedDate = "";
      if (formData.date) {
        const dateParts = formData.date.split('-');
        formattedDate = dateParts.length === 3 
          ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`
          : formData.date;
      }

      // Convert payment date from YYYY-MM-DD to DD.MM.YYYY format if provided
      let formattedPaymentDate = undefined;
      if (formData.paymentDate) {
        const paymentDateParts = formData.paymentDate.split('-');
        formattedPaymentDate = paymentDateParts.length === 3 
          ? `${paymentDateParts[2]}.${paymentDateParts[1]}.${paymentDateParts[0]}`
          : formData.paymentDate;
      }

      // Calculate status based on payment cycle if date is provided, otherwise keep existing status
      const calculatedStatus = formData.date 
        ? calculatePaymentStatus(formData.date, formData.paymentCycle)
        : undefined;
      
      const updatedPayroll: Partial<Omit<Payroll, "id">> = {
        ...(formData.month && { month: formData.month }),
        ...(formattedDate && { date: formattedDate }),
        ...(formData.modeOfCashFlow && { modeOfCashFlow: formData.modeOfCashFlow }),
        ...(formData.typeOfCashFlow && { typeOfCashFlow: formData.typeOfCashFlow }),
        ...(formData.name && { name: formData.name }),
        ...(formData.siteOfWork !== undefined && { siteOfWork: formData.siteOfWork || undefined }),
        ...(formData.abnRegistered !== undefined && { abnRegistered: formData.abnRegistered }),
        ...(formData.gstRegistered !== undefined && { gstRegistered: formData.gstRegistered }),
        ...(formData.invoiceNumber !== undefined && { invoiceNumber: formData.invoiceNumber || undefined }),
        ...(formData.amountExclGst !== undefined && { amountExclGst: parseFloat(formData.amountExclGst) || 0 }),
        ...(formData.gstAmount !== undefined && { gstAmount: parseFloat(formData.gstAmount) || 0 }),
        ...(formData.totalAmount !== undefined && { totalAmount: parseFloat(formData.totalAmount) || 0 }),
        ...(formData.currency && { currency: formData.currency }),
        ...(formData.paymentMethod && { paymentMethod: formData.paymentMethod }),
        ...(formattedPaymentDate !== undefined && { paymentDate: formattedPaymentDate }),
        ...(formData.paymentReceiptNumber !== undefined && { paymentReceiptNumber: formData.paymentReceiptNumber || undefined }),
        ...(calculatedStatus && { status: calculatedStatus }),
        ...(formData.notes !== undefined && { notes: formData.notes || undefined }),
        ...(formData.frequency && { frequency: formData.frequency }),
        ...(formData.paymentCycle !== undefined && { paymentCycle: formData.paymentCycle }),
        ...(formData.attachedFiles.length > 0 && { attachedFiles: formData.attachedFiles }),
      };

      await updatePayroll(editingPayrollId, updatedPayroll);
      
      // Reload payrolls
      const updatedPayrolls = await getAllPayrolls();
      setPayrolls(updatedPayrolls);
      
      toast.success("Payroll updated successfully!");
      setIsAddDialogOpen(false);
      setReceiptFile(null);
      setAttachedFiles([]);
      setEmployeePopoverOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating payroll:", error);
      toast.error("Failed to update payroll. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (payroll: Payroll) => {
    setPayrollToDelete(payroll);
    setDeleteDialogOpen(true);
  };

  const handleDeletePayroll = async () => {
    if (!payrollToDelete) return;

    try {
      setIsDeleting(true);
      await deletePayroll(payrollToDelete.id);
      
      // Reload payrolls
      const updatedPayrolls = await getAllPayrolls();
      setPayrolls(updatedPayrolls);
      
      toast.success("Payroll deleted successfully!");
      setDeleteDialogOpen(false);
      setPayrollToDelete(null);
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error("Failed to delete payroll. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get unique months for filters
  const uniqueMonths = Array.from(new Set(payrolls.map(p => p.month))).sort();
  
  // All months for the form dropdown
  const allMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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

  const filteredPayrolls = payrolls.filter(payroll => {
    const matchesSearch = payroll.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      payroll.siteOfWork?.toLowerCase().includes(searchValue.toLowerCase()) ||
      payroll.invoiceNumber?.toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = statusFilter === "all" || payroll.status === statusFilter;
    const matchesMode = modeFilter === "all" || payroll.modeOfCashFlow === modeFilter;
    const matchesMonth = monthFilter === "all" || payroll.month === monthFilter;
    
    // Date range filtering
    let matchesDate = true;
    if (dateRange?.from || dateRange?.to) {
      const payrollDate = parseDate(payroll.date);
      if (payrollDate) {
        if (dateRange.from && dateRange.to) {
          // Both dates selected - check if payroll date is within range
          matchesDate = payrollDate >= dateRange.from && payrollDate <= dateRange.to;
        } else if (dateRange.from) {
          // Only from date selected
          matchesDate = payrollDate >= dateRange.from;
        } else if (dateRange.to) {
          // Only to date selected
          matchesDate = payrollDate <= dateRange.to;
        }
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesMode && matchesMonth && matchesDate;
  });

  // Calculate chart data
  // Area Chart: Monthly inflow and outflow totals
  const monthlyData = payrolls.reduce((acc, payroll) => {
    const month = payroll.month;
    if (!acc[month]) {
      acc[month] = { month, inflow: 0, outflow: 0 };
    }
    if (payroll.modeOfCashFlow === "inflow") {
      acc[month].inflow += payroll.totalAmount;
    } else {
      acc[month].outflow += payroll.totalAmount;
    }
    return acc;
  }, {} as Record<string, { month: string; inflow: number; outflow: number }>);

  const areaChartData = Object.values(monthlyData)
    .sort((a, b) => {
      const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    })
    .map(item => ({
      month: item.month,
      inflow: Math.round(item.inflow),
      outflow: Math.round(item.outflow),
    }));

  // Pie Chart: Total inflow vs outflow
  const totalInflow = payrolls
    .filter(p => p.modeOfCashFlow === "inflow")
    .reduce((sum, p) => sum + p.totalAmount, 0);
  const totalOutflow = payrolls
    .filter(p => p.modeOfCashFlow === "outflow")
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const pieChartData = [
    { 
      type: "inflow", 
      amount: Math.round(totalInflow), 
      fill: "hsl(var(--chart-1))" 
    },
    { 
      type: "outflow", 
      amount: Math.round(totalOutflow), 
      fill: "hsl(var(--chart-2))" 
    },
  ].filter(item => item.amount > 0);

  // Bar Chart: Monthly net cash flow (inflow - outflow)
  const barChartData = areaChartData.map(item => ({
    month: item.month,
    net: Math.round(item.inflow - item.outflow),
  }));

  const areaChartConfig = {
    inflow: {
      label: "Inflow",
      color: "hsl(var(--chart-1))",
    },
    outflow: {
      label: "Outflow",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  const pieChartConfig = {
    amount: {
      label: "Amount",
    },
    inflow: {
      label: "Inflow",
      color: "hsl(var(--chart-1))",
    },
    outflow: {
      label: "Outflow",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  const barChartConfig = {
    net: {
      label: "Net Cash Flow",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-background border border-blue-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Payroll
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage employee payroll with comprehensive cash flow tracking (includes 10% GST)</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              size="lg"
            >
            <Plus className="mr-2 h-4 w-4" />
            Add Payroll
          </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Statistical Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-200 dark:border-green-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-green-400/30 transition-colors"></div>
          <CardHeader className="relative px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Inflow</CardTitle>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400 mt-2">
              {formatCurrency(totalInflow)}
            </div>
          </CardHeader>
          <CardContent className="bg-green-50/50 dark:bg-green-950/20 rounded-b-2xl px-6 py-4 border-t border-green-200 dark:border-green-900/50">
            <p className="text-xs text-muted-foreground font-medium">
              {filteredPayrolls.filter(p => p.modeOfCashFlow === "inflow").length} inflow entries
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-2 border-red-200 dark:border-red-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-red-400/30 transition-colors"></div>
          <CardHeader className="relative px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Outflow</CardTitle>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400 mt-2">
              {formatCurrency(totalOutflow)}
            </div>
          </CardHeader>
          <CardContent className="bg-red-50/50 dark:bg-red-950/20 rounded-b-2xl px-6 py-4 border-t border-red-200 dark:border-red-900/50">
            <p className="text-xs text-muted-foreground font-medium">
              {filteredPayrolls.filter(p => p.modeOfCashFlow === "outflow").length} outflow entries
            </p>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden bg-gradient-to-br ${(totalInflow - totalOutflow) >= 0 ? 'from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-900/50' : 'from-red-50 to-rose-100/50 dark:from-red-950/30 dark:to-rose-900/20 border-2 border-red-200 dark:border-red-900/50'} shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group`}>
          <div className={`absolute top-0 right-0 w-32 h-32 ${(totalInflow - totalOutflow) >= 0 ? 'bg-green-400/20 group-hover:bg-green-400/30' : 'bg-red-400/20 group-hover:bg-red-400/30'} rounded-full -mr-16 -mt-16 transition-colors`}></div>
          <CardHeader className="relative px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${(totalInflow - totalOutflow) >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} shadow-lg`}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Net Cash Flow</CardTitle>
            <div className={`text-3xl font-bold mt-2 ${(totalInflow - totalOutflow) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {formatCurrency(totalInflow - totalOutflow)}
            </div>
          </CardHeader>
          <CardContent className={`${(totalInflow - totalOutflow) >= 0 ? 'bg-green-50/50 dark:bg-green-950/20 border-t border-green-200 dark:border-green-900/50' : 'bg-red-50/50 dark:bg-red-950/20 border-t border-red-200 dark:border-red-900/50'} rounded-b-2xl px-6 py-4`}>
            <p className="text-xs text-muted-foreground font-medium">
              {totalInflow > totalOutflow ? "Positive" : "Negative"} cash flow
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Area Chart - Monthly Inflow/Outflow Trends */}
        <Card className="shadow-card border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Cash Flow Trends</CardTitle>
            <CardDescription className="text-xs">
              Monthly inflow and outflow totals
            </CardDescription>
          </CardHeader>
          <CardContent className="px-1 pr-2">
            {!isLoading && payrolls.length > 0 && areaChartData.length > 0 ? (
              <ChartContainer config={areaChartConfig} className="h-[300px] w-full -mx-1">
                <AreaChart
                  accessibilityLayer
                  data={areaChartData}
                  margin={{
                    left: 4,
                    right: 4,
                    top: 8,
                    bottom: 8,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    fontSize={10}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <defs>
                    <linearGradient id="fillInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-inflow)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-inflow)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-outflow)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-outflow)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="outflow"
                    type="natural"
                    fill="url(#fillOutflow)"
                    fillOpacity={0.4}
                    stroke="var(--color-outflow)"
                    stackId="a"
                  />
                  <Area
                    dataKey="inflow"
                    type="natural"
                    fill="url(#fillInflow)"
                    fillOpacity={0.4}
                    stroke="var(--color-inflow)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <div className="flex w-full items-start gap-2 text-xs">
              <div className="grid gap-1">
                <div className="leading-none font-medium">
                  Inflow: ${totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-muted-foreground leading-none">
                  Outflow: ${totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Pie Chart - Inflow vs Outflow Distribution */}
        <Card className="flex flex-col shadow-card border">
          <CardHeader className="items-center pb-4">
            <CardTitle className="text-lg font-semibold">Cash Flow Distribution</CardTitle>
            <CardDescription className="text-xs">Inflow vs Outflow</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {!isLoading && payrolls.length > 0 && pieChartData.length > 0 && pieChartData.some(d => d.amount > 0) ? (
              <ChartContainer
                config={pieChartConfig}
                className="mx-auto aspect-square h-[300px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie 
                    data={pieChartData} 
                    dataKey="amount" 
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={0}
                    label={({ type, amount }) => `${type}: $${amount.toLocaleString()}`}
                    labelLine={false}
                  />
                </PieChart>
              </ChartContainer>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-1 text-xs pt-2">
            <div className="leading-none font-medium">
              Net: ${(totalInflow - totalOutflow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-muted-foreground leading-none">
              {totalInflow > totalOutflow ? "Positive" : "Negative"}
            </div>
          </CardFooter>
        </Card>

        {/* Bar Chart - Monthly Net Cash Flow */}
        <Card className="shadow-card border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Monthly Net Cash Flow</CardTitle>
            <CardDescription className="text-xs">
              Inflow minus Outflow by month
            </CardDescription>
          </CardHeader>
          <CardContent className="px-1 pr-2">
            {!isLoading && payrolls.length > 0 && barChartData.length > 0 ? (
              <ChartContainer config={barChartConfig} className="h-[300px] w-full -mx-1">
                <BarChart
                  accessibilityLayer
                  data={barChartData}
                  margin={{
                    top: 8,
                    left: 4,
                    right: 4,
                    bottom: 8,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                    fontSize={10}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar 
                    dataKey="net" 
                    fill="var(--color-net)"
                    radius={8}
                  >
                    <LabelList
                      position="top"
                      offset={8}
                      className="fill-foreground"
                      fontSize={10}
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-1 text-xs pt-2">
            <div className="flex gap-2 leading-none font-medium">
              {totalInflow > totalOutflow ? (
                <>
                  Positive <TrendingUp className="h-3 w-3" />
                </>
              ) : (
                "Negative"
              )}
            </div>
            <div className="text-muted-foreground leading-none">
              Net cash flow
            </div>
          </CardFooter>
        </Card>
      </div>

      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-muted/30 border-b-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Payroll List</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">View and manage all payroll records</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="transition-all duration-200"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Card View
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="transition-all duration-200"
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, site, or invoice..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={monthPopoverOpen}
                    className="w-[150px] justify-between"
                  >
                    {monthFilter === "all" ? "All Months" : monthFilter}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search month..." />
                    <CommandList>
                      <CommandEmpty>No month found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setMonthFilter("all");
                            setMonthPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              monthFilter === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Months
                        </CommandItem>
                        {uniqueMonths.map((month) => (
                          <CommandItem
                            key={month}
                            value={month}
                            onSelect={() => {
                              setMonthFilter(month);
                              setMonthPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                monthFilter === month ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {month}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                          {format(dateRange.from, "dd.MM.yyyy")} -{" "}
                          {format(dateRange.to, "dd.MM.yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd.MM.yyyy")
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
              <Select value={modeFilter} onValueChange={(value) => setModeFilter(value as "all" | "inflow" | "outflow")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="inflow">Inflow</SelectItem>
                  <SelectItem value="outflow">Outflow</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredPayrolls.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              No payroll records found
            </div>
          ) : viewMode === "table" ? (
          <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-blue-500/5 border-b-2">
                  <TableHead className="w-[50px] font-bold text-foreground">ID</TableHead>
                  <TableHead className="font-bold text-foreground">Mode</TableHead>
                  <TableHead className="font-bold text-foreground">Type</TableHead>
                  <TableHead className="font-bold text-foreground">Date</TableHead>
                  <TableHead className="font-bold text-foreground">Name</TableHead>
                  <TableHead className="font-bold text-foreground">Site of Work</TableHead>
                  <TableHead className="font-bold text-foreground">ABN</TableHead>
                  <TableHead className="font-bold text-foreground">GST</TableHead>
                  <TableHead className="font-bold text-foreground">Invoice #</TableHead>
                  <TableHead className="font-bold text-foreground">Amount (Excl. GST)</TableHead>
                  <TableHead className="font-bold text-foreground">GST Amount</TableHead>
                  <TableHead className="font-bold text-foreground">Total Amount</TableHead>
                  <TableHead className="font-bold text-foreground">Payment Method</TableHead>
                  <TableHead className="font-bold text-foreground">Payment Date</TableHead>
                  <TableHead className="font-bold text-foreground">Receipt #</TableHead>
                  <TableHead className="font-bold text-foreground">Status</TableHead>
                  <TableHead className="font-bold text-foreground">Notes</TableHead>
                  <TableHead className="w-[100px] font-bold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
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
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  filteredPayrolls.map((payroll, index) => (
                    <TableRow 
                      key={payroll.id}
                      className="hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200 border-b"
                    >
                      <TableCell className="font-semibold">{index + 1}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={payroll.modeOfCashFlow === "inflow" ? "default" : "destructive"}
                          className={payroll.modeOfCashFlow === "inflow" 
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                            : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"}
                        >
                          {payroll.modeOfCashFlow === "inflow" ? "Inflow" : "Outflow"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{payroll.typeOfCashFlow === "invoice" ? "Invoice" : 
                         payroll.typeOfCashFlow === "internal_payroll" ? "Internal Payroll" : 
                         "Cleaner Payroll"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(payroll.date)}</span>
                      </TableCell>
                      <TableCell className="font-semibold">{payroll.name}</TableCell>
                      <TableCell>
                        {payroll.siteOfWork ? (
                          <Badge variant="outline" className="text-xs">
                            {payroll.siteOfWork}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={payroll.abnRegistered ? "default" : "destructive"}
                          className={payroll.abnRegistered 
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                            : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"}
                        >
                          {payroll.abnRegistered ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={payroll.gstRegistered ? "default" : "destructive"}
                          className={payroll.gstRegistered 
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                            : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"}
                        >
                          {payroll.gstRegistered ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payroll.invoiceNumber ? (
                          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-mono text-sm">
                            {payroll.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          ${payroll.amountExclGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          ${payroll.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-green-600 dark:text-green-400">
                        ${payroll.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {payroll.paymentMethod === "bank_transfer" ? "Bank Transfer" :
                           payroll.paymentMethod === "cash" ? "Cash" :
                           payroll.paymentMethod === "cheque" ? "Cheque" :
                           payroll.paymentMethod === "credit_card" ? "Credit Card" : "Other"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payroll.paymentDate ? (
                          <span className="text-sm">{formatDate(payroll.paymentDate)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                        {payroll.paymentReceiptNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payroll.status} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {payroll.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPayroll(payroll)}
                          className="h-8 w-8 hover:bg-primary/10 transition-all duration-200"
                        >
                          <Edit2 className="h-4 w-4 text-primary" />
                        </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(payroll)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPayrolls.map((payroll, index) => (
                <Card key={payroll.id} className="relative flex flex-col h-[600px]">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono">#{index + 1}</Badge>
                          <Badge variant={payroll.modeOfCashFlow === "inflow" ? "default" : "destructive"}>
                            {payroll.modeOfCashFlow === "inflow" ? "Inflow" : "Outflow"}
                          </Badge>
                          <StatusBadge status={payroll.status} />
                        </div>
                        <CardTitle className="text-2xl font-bold mt-2">{payroll.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {payroll.typeOfCashFlow === "invoice" ? "Invoice" : 
                           payroll.typeOfCashFlow === "internal_payroll" ? "Internal Payroll" : 
                           "Cleaner Payroll"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPayroll(payroll)}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(payroll)}
                          className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-xs text-muted-foreground mb-1">Date</p>
                        <p>{formatDate(payroll.date)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-muted-foreground mb-1">Month</p>
                        <p>{payroll.month}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-muted-foreground mb-1">Site</p>
                        <p className="truncate">{payroll.siteOfWork || "-"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Badge variant={payroll.abnRegistered ? "default" : "destructive"} className="text-xs">
                        ABN: {payroll.abnRegistered ? "Yes" : "No"}
                      </Badge>
                      <Badge variant={payroll.gstRegistered ? "default" : "destructive"} className="text-xs">
                        GST: {payroll.gstRegistered ? "Yes" : "No"}
                      </Badge>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Amount (Excl. GST)</span>
                        <span className="font-medium">${payroll.amountExclGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">GST Amount</span>
                        <span className="font-medium">${payroll.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-semibold">Total Amount</span>
                        <span className="font-bold text-lg">${payroll.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t text-sm">
                      <div>
                        <p className="font-semibold text-xs text-muted-foreground mb-1">Payment Method</p>
                        <Badge variant="outline">
                          {payroll.paymentMethod === "bank_transfer" ? "Bank Transfer" :
                           payroll.paymentMethod === "cash" ? "Cash" :
                           payroll.paymentMethod === "cheque" ? "Cheque" :
                           payroll.paymentMethod === "credit_card" ? "Credit Card" : "Other"}
                        </Badge>
                      </div>
                      {payroll.paymentDate && (
                        <div>
                          <p className="font-semibold text-xs text-muted-foreground mb-1">Payment Date</p>
                          <p>{formatDate(payroll.paymentDate)}</p>
                        </div>
                      )}
                      {payroll.paymentReceiptNumber && (
                        <div>
                          <p className="font-semibold text-xs text-muted-foreground mb-1">Receipt #</p>
                          <p className="truncate">{payroll.paymentReceiptNumber}</p>
                        </div>
                      )}
                      {payroll.invoiceNumber && (
                        <div>
                          <p className="font-semibold text-xs text-muted-foreground mb-1">Invoice #</p>
                          <p>{payroll.invoiceNumber}</p>
                        </div>
                      )}
                      {payroll.notes && (
                        <div>
                          <p className="font-semibold text-xs text-muted-foreground mb-1">Notes</p>
                          <p className="text-xs line-clamp-2">{payroll.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/inve.jpg"
                alt="Add Payroll"
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
                    Add a new payroll entry
                  </h2>
                  <p className="text-sm text-white">
                    Add a new payroll entry to the system by filling in the details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>{editingPayrollId ? "Edit Payroll" : "Add Payroll"}</DialogTitle>
                  <DialogDescription>
                    {editingPayrollId 
                      ? "Update the payroll details below."
                      : "Fill in the payroll details. All fields matching the table columns are available."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Month *</Label>
                      <Popover open={formMonthPopoverOpen} onOpenChange={setFormMonthPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={formMonthPopoverOpen}
                            className="w-full justify-between"
                          >
                            {formData.month || "Select month..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search month..." />
                            <CommandList>
                              <CommandEmpty>No month found.</CommandEmpty>
                              <CommandGroup>
                                {allMonths.map((month) => (
                                  <CommandItem
                                    key={month}
                                    value={month}
                                    onSelect={() => {
                                      handleInputChange("month", month);
                                      setFormMonthPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.month === month ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {month}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange("date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modeOfCashFlow">Mode of Cash Flow *</Label>
                      <Select
                        value={formData.modeOfCashFlow}
                        onValueChange={(value) => handleInputChange("modeOfCashFlow", value as CashFlowMode)}
                      >
                        <SelectTrigger id="modeOfCashFlow">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inflow">Inflow</SelectItem>
                          <SelectItem value="outflow">Outflow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="typeOfCashFlow">Type of Cash Flow *</Label>
                      <Select
                        value={formData.typeOfCashFlow}
                        onValueChange={(value) => handleInputChange("typeOfCashFlow", value as CashFlowType)}
                      >
                        <SelectTrigger id="typeOfCashFlow">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="internal_payroll">Internal Payroll</SelectItem>
                          <SelectItem value="cleaner_payroll">Cleaner Payroll</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Payroll Frequency</Label>
                      <Select
                        value={formData.frequency}
                        onValueChange={(value) => handleInputChange("frequency", value as PayrollFrequency)}
                      >
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
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
                                      .filter((employee, index, self) => 
                                        // Additional deduplication: keep only first occurrence of each name
                                        index === self.findIndex(emp => 
                                          emp.name.toLowerCase().trim() === employee.name.toLowerCase().trim()
                                        )
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteOfWork">Site of Work</Label>
                      <Select
                        value={formData.siteOfWork}
                        onValueChange={(value) => handleInputChange("siteOfWork", value)}
                      >
                        <SelectTrigger id="siteOfWork">
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
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumber">Invoice Number</Label>
                      <Input
                        id="invoiceNumber"
                        value={formData.invoiceNumber}
                        onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                        placeholder="N/A for outflows"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="abnRegistered"
                        checked={formData.abnRegistered}
                        onCheckedChange={(checked) => handleInputChange("abnRegistered", checked as boolean)}
                      />
                      <Label htmlFor="abnRegistered" className="cursor-pointer">ABN Registered</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gstRegistered"
                        checked={formData.gstRegistered}
                        onCheckedChange={(checked) => handleInputChange("gstRegistered", checked as boolean)}
                      />
                      <Label htmlFor="gstRegistered" className="cursor-pointer">GST Registered</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amountExclGst">Amount (Excl. GST) *</Label>
                      <Input
                        id="amountExclGst"
                        type="number"
                        step="0.01"
                        value={formData.amountExclGst}
                        onChange={(e) => handleInputChange("amountExclGst", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstAmount">GST Amount (10%)</Label>
                      <Input
                        id="gstAmount"
                        type="number"
                        step="0.01"
                        value={formData.gstAmount}
                        readOnly
                        className="bg-muted"
                        placeholder="Auto-calculated"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">Total Amount</Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        value={formData.totalAmount}
                        readOnly
                        className="bg-muted"
                        placeholder="Auto-calculated"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => handleInputChange("currency", value)}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUD">AUD</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(value) => handleInputChange("paymentMethod", value as PaymentMethod)}
                      >
                        <SelectTrigger id="paymentMethod">
                          <SelectValue />
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
                      <Label htmlFor="paymentCycle">Payment Cycle (Days)</Label>
                      <Input
                        id="paymentCycle"
                        type="number"
                        min="1"
                        value={formData.paymentCycle}
                        onChange={(e) => handleInputChange("paymentCycle", parseInt(e.target.value) || 45)}
                        placeholder="45"
                      />
                      <p className="text-xs text-muted-foreground">
                        Payments become pending on day {formData.paymentCycle} and overdue from day {formData.paymentCycle + 1}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentDate">Payment Date</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={formData.paymentDate}
                        onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentReceiptNumber">Payment Receipt Number</Label>
                      <Input
                        id="paymentReceiptNumber"
                        value={formData.paymentReceiptNumber}
                        onChange={(e) => handleInputChange("paymentReceiptNumber", e.target.value)}
                        placeholder="Receipt number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleInputChange("status", value as PaymentStatus)}
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Status is auto-calculated based on payment cycle
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Attached Files</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-muted-foreground/50"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        onChange={handleFileInputChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                      />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div className="text-sm">
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer text-primary hover:underline"
                          >
                            Click to upload
                          </label>
                          <span className="text-muted-foreground"> or drag and drop</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOCX, JPEG, XLSX, or TXT (max 50MB)
                        </p>
                      </div>
                    </div>
                    {attachedFiles.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {attachedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <File className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024).toFixed(2)} KB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveAttachedFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={editingPayrollId ? handleUpdatePayroll : handleAddPayroll} 
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingPayrollId ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      editingPayrollId ? "Update Payroll" : "Add Payroll"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the payroll record for{" "}
              <span className="font-semibold">{payrollToDelete?.name}</span> from{" "}
              <span className="font-semibold">{payrollToDelete?.month}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayroll}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payroll;
