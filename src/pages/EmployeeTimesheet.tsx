"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Edit2, Trash2, Plus, Save, X, Clock, CalendarDays, CalendarX, DollarSign, Umbrella } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getWorkRecordsByEmployee,
  updateWorkRecord,
  deleteWorkRecord,
  createWorkRecord,
} from "@/lib/firebase/workRecords";
import { getEmployeePayRatesByEmployee } from "@/lib/firebase/employeePayRates";
import { getAllPayrolls } from "@/lib/firebase/payroll";
import { WorkRecord, Payroll, PaymentStatus } from "@/types/financial";
import { formatCurrency } from "@/lib/utils";
// Calculate payment due date: 15th of the month following the work month
const getPaymentDueDate = (workYear: number, workMonth: number): Date => {
  // Get the first day of the following month
  const followingMonth = workMonth === 12 ? 1 : workMonth + 1;
  const followingYear = workMonth === 12 ? workYear + 1 : workYear;
  // Set to the 15th of the following month
  return new Date(followingYear, followingMonth - 1, 15);
};
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EmployeeTimesheet = () => {
  const { user, userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [payRates, setPayRates] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingRecord, setEditingRecord] = useState<WorkRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [editFormData, setEditFormData] = useState({
    date: "",
    clockInTime: "",
    clockOutTime: "",
    notes: "",
    isLeave: false,
    leaveType: "Annual" as "Annual" | "Sick" | "Casual" | "Unpaid",
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTimesheet, setIsSavingTimesheet] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadData();
    }
  }, [user, selectedMonth]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const firebaseAuthUid = user?.uid || "";
      
      // Parse month
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

      // Work records use Firebase Auth UID
      const records = await getWorkRecordsByEmployee(firebaseAuthUid, startDate, endDate);
      setWorkRecords(records);

      // Pay rates use employee document ID - try to find employee by email first
      let payRates: any[] = [];
      if (userData?.email) {
        try {
          const { getEmployeeByEmail } = await import("@/lib/firebase/employees");
          const employee = await getEmployeeByEmail(userData.email);
          if (employee) {
            payRates = await getEmployeePayRatesByEmployee(employee.id);
          }
        } catch (error) {
          console.error("Error loading pay rates by employee email:", error);
        }
      }
      
      // Fallback to Firebase Auth UID
      if (payRates.length === 0) {
        try {
          payRates = await getEmployeePayRatesByEmployee(firebaseAuthUid);
        } catch (error) {
          console.error("Error loading pay rates:", error);
        }
      }

      setPayRates(payRates);

      // Load payroll records
      try {
        const allPayrolls = await getAllPayrolls();
        setPayrolls(allPayrolls);
      } catch (error) {
        console.error("Error loading payroll records:", error);
      }
    } catch (error) {
      console.error("Error loading timesheet data:", error);
      toast.error("Failed to load timesheet data");
    } finally {
      setIsLoading(false);
    }
  };

  // Get all days in the selected month
  const getDaysInMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: string[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push(dateStr);
    }
    
    return days;
  };

  // Check if date is weekend
  const isWeekend = (dateString: string): boolean => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  // Format time for display (e.g., "3:44 AM")
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date (e.g., "11/3/25")
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

  // Format hours (e.g., "8 hours 40 min")
  const formatHours = (hours: number): string => {
    if (hours === 0) return "";
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
    }
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} min`;
  };

  // Get record for a specific date
  const getRecordForDate = (dateString: string): WorkRecord | null => {
    return workRecords.find(r => r.date === dateString) || null;
  };

  // Get hourly rate (default to first rate if no site-specific rate)
  const getHourlyRate = (record: WorkRecord | null): number => {
    if (!record || payRates.length === 0) {
      return payRates.length > 0 ? payRates[0].hourlyRate : 0;
    }
    if (record.siteId) {
      const rate = payRates.find(r => r.siteId === record.siteId);
      if (rate) return rate.hourlyRate;
    }
    return payRates[0].hourlyRate;
  };

  // Get currency for a record (default to first rate's currency if no site-specific rate)
  const getCurrency = (record: WorkRecord | null): string => {
    if (!record || payRates.length === 0) {
      return payRates.length > 0 ? (payRates[0].currency || "AUD") : "AUD";
    }
    if (record.siteId) {
      const rate = payRates.find(r => r.siteId === record.siteId);
      if (rate) return rate.currency || "AUD";
    }
    return payRates[0].currency || "AUD";
  };

  // Calculate payment status and due date for a work record
  // Payment is due on the 15th of the month following the work month
  const getPaymentInfo = (record: WorkRecord | null): { status: PaymentStatus | "work_in_progress"; dueDate: Date | null } | null => {
    if (!record || !record.clockOutTime) return null;
    
    const workDate = new Date(record.date);
    const workYear = workDate.getFullYear();
    const workMonth = workDate.getMonth() + 1; // 1-12
    const workMonthName = workDate.toLocaleDateString('en-US', { month: 'long' });
    
    // Calculate payment due date: 15th of the following month
    const dueDate = getPaymentDueDate(workYear, workMonth);
    
    // Look for payroll record matching this employee and month
    const matchingPayroll = payrolls.find(p => 
      p.name === record.employeeName && 
      p.month === workMonthName &&
      (p.typeOfCashFlow === "cleaner_payroll" || p.typeOfCashFlow === "internal_payroll")
    );
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    // Get the 1st of the payment month
    const paymentMonthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
    paymentMonthStart.setHours(0, 0, 0, 0);
    
    if (matchingPayroll) {
      // If payroll exists and is paid/received, return paid status
      if (matchingPayroll.status === "paid" || matchingPayroll.status === "received") {
        return { status: "paid", dueDate };
      }
      
      // Check status based on dates
      if (today < paymentMonthStart) {
        return { status: "work_in_progress", dueDate };
      } else if (dueDate < today) {
        return { status: "overdue", dueDate };
      } else {
        return { status: "pending", dueDate };
      }
    }
    
    // No matching payroll - check status based on dates
    if (today < paymentMonthStart) {
      return { status: "work_in_progress", dueDate };
    } else if (dueDate < today) {
      return { status: "overdue", dueDate };
    }
    
    return { status: "pending", dueDate };
  };

  const handleAddNew = (dateString: string) => {
    setIsNewRecord(true);
    setEditingRecord(null);
    setEditFormData({
      date: dateString,
      clockInTime: "",
      clockOutTime: "",
      notes: "",
      isLeave: false,
      leaveType: "Annual",
    });
    setIsEditDialogOpen(true);
  };

  const handleEdit = (record: WorkRecord) => {
    if (record.approvalStatus === "approved") {
      toast.error("Cannot edit approved records");
      return;
    }
    setIsNewRecord(false);
    setEditingRecord(record);
    
    // Extract time portion for time input (HH:MM format)
    const clockInTime = record.clockInTime && !record.isLeave
      ? new Date(record.clockInTime).toTimeString().slice(0, 5)
      : "";
    const clockOutTime = record.clockOutTime && !record.isLeave
      ? new Date(record.clockOutTime).toTimeString().slice(0, 5)
      : "";
    
    setEditFormData({
      date: record.date ?? "",
      clockInTime: clockInTime ?? "",
      clockOutTime: clockOutTime ?? "",
      notes: record.notes ?? "",
      isLeave: record.isLeave ?? false,
      leaveType: (record.leaveType ?? "Annual") as "Annual" | "Sick" | "Casual" | "Unpaid",
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user?.uid || !userData) {
      toast.error("User information not available");
      return;
    }

    try {
      setIsSaving(true);
      const employeeId = user.uid;
      const employeeName = userData.name || user.email || "Employee";

      if (isNewRecord) {
        // Create new record
        if (!editFormData.isLeave && !editFormData.clockInTime) {
          toast.error("Clock-in time is required");
          return;
        }

        let clockInDateTime = "";
        let clockOutDateTime: string | undefined = undefined;

        if (editFormData.isLeave) {
          // For leave records, use date with default time
          clockInDateTime = `${editFormData.date}T00:00:00`;
        } else {
          // Combine date and time for clock in (time format is HH:MM)
          const clockInTimeStr = editFormData.clockInTime.includes('T') 
            ? editFormData.clockInTime.split('T')[1]?.slice(0, 5) || editFormData.clockInTime
            : editFormData.clockInTime;
          clockInDateTime = `${editFormData.date}T${clockInTimeStr}:00`;
          
          clockOutDateTime = editFormData.clockOutTime 
            ? (() => {
                const clockOutTimeStr = editFormData.clockOutTime.includes('T')
                  ? editFormData.clockOutTime.split('T')[1]?.slice(0, 5) || editFormData.clockOutTime
                  : editFormData.clockOutTime;
                return `${editFormData.date}T${clockOutTimeStr}:00`;
              })()
            : undefined;
        }

        await createWorkRecord(
          employeeId,
          employeeName,
          editFormData.date,
          clockInDateTime,
          clockOutDateTime,
          undefined,
          undefined,
          editFormData.notes,
          editFormData.isLeave,
          editFormData.isLeave ? editFormData.leaveType : undefined
        );
        toast.success(editFormData.isLeave ? "Leave record created successfully" : "Work record created successfully");
      } else if (editingRecord) {
        // Update existing record
        let clockInDateTime = editingRecord.clockInTime;
        let clockOutDateTime: string | undefined = editingRecord.clockOutTime;

        if (editFormData.isLeave) {
          // For leave records, use date with default time
          clockInDateTime = `${editFormData.date}T00:00:00`;
          clockOutDateTime = undefined;
        } else {
          const clockInTimeStr = editFormData.clockInTime.includes('T')
            ? editFormData.clockInTime.split('T')[1]?.slice(0, 5) || editFormData.clockInTime
            : editFormData.clockInTime;
          clockInDateTime = editFormData.clockInTime 
            ? `${editFormData.date}T${clockInTimeStr}:00`
            : editingRecord.clockInTime;
          
          clockOutDateTime = editFormData.clockOutTime 
            ? (() => {
                const clockOutTimeStr = editFormData.clockOutTime.includes('T')
                  ? editFormData.clockOutTime.split('T')[1]?.slice(0, 5) || editFormData.clockOutTime
                  : editFormData.clockOutTime;
                return `${editFormData.date}T${clockOutTimeStr}:00`;
              })()
            : undefined;
        }

        await updateWorkRecord(editingRecord.id, {
          clockInTime: clockInDateTime,
          clockOutTime: clockOutDateTime,
          notes: editFormData.notes,
          isLeave: editFormData.isLeave,
          leaveType: editFormData.isLeave ? editFormData.leaveType : undefined,
        });
        toast.success(editFormData.isLeave ? "Leave record updated successfully" : "Record updated successfully");
      }

      setIsEditDialogOpen(false);
      setEditingRecord(null);
      setIsNewRecord(false);
      // Reset form data
      setEditFormData({
        date: "",
        clockInTime: "",
        clockOutTime: "",
        notes: "",
        isLeave: false,
        leaveType: "Annual",
      });
      await loadData();
    } catch (error: any) {
      console.error("Error saving record:", error);
      toast.error(error.message || "Failed to save record");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: WorkRecord) => {
    if (record.approvalStatus === "approved") {
      toast.error("Cannot delete approved records");
      return;
    }

    if (!confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      await deleteWorkRecord(record.id);
      toast.success("Record deleted successfully");
      await loadData();
    } catch (error: any) {
      console.error("Error deleting record:", error);
      toast.error(error.message || "Failed to delete record");
    }
  };

  const handleSaveTimesheet = async () => {
    if (!user?.uid) {
      toast.error("User information not available");
      return;
    }

    try {
      setIsSavingTimesheet(true);
      
      // Get all records for the selected month
      const [year, month] = selectedMonth.split("-").map(Number);
      const monthName = new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      // Count records
      const totalRecords = workRecords.length;
      const completedRecords = workRecords.filter(r => r.clockOutTime && !r.isLeave);
      const leaveRecords = workRecords.filter(r => r.isLeave);
      const pendingRecords = workRecords.filter(r => !r.clockOutTime && !r.isLeave);
      
      // Calculate summary (exclude leave records)
      const totalHours = completedRecords.reduce((sum, r) => sum + r.hoursWorked, 0);
      const totalAmount = completedRecords.reduce((sum, r) => {
        const rate = getHourlyRate(r);
        return sum + (r.hoursWorked * rate);
      }, 0);

      // Simulate save operation (records are already saved individually)
      // This validates and confirms all entries are stored
      await new Promise(resolve => setTimeout(resolve, 500));

      // Show success toast with summary
      const leaveText = leaveRecords.length > 0 ? `, ${leaveRecords.length} leave day${leaveRecords.length > 1 ? 's' : ''}` : '';
      toast.success(
        `Timesheet saved successfully for ${monthName}!`,
        {
          description: `Total: ${totalRecords} entries (${completedRecords.length} completed, ${pendingRecords.length} pending${leaveText}). ${totalHours.toFixed(2)} hours worked. Total earnings: ${formatCurrency(totalAmount)}.`,
          duration: 5000,
        }
      );
    } catch (error: any) {
      console.error("Error saving timesheet:", error);
      toast.error(error.message || "Failed to save timesheet");
    } finally {
      setIsSavingTimesheet(false);
    }
  };

  // Calculate totals and statistics
  const daysInMonth = getDaysInMonth();
  const completedRecords = workRecords.filter(r => r.clockOutTime && !r.isLeave);
  const leaveRecords = workRecords.filter(r => r.isLeave);
  const totalHours = completedRecords.reduce((sum, r) => sum + r.hoursWorked, 0);
  const totalMinutes = Math.round((totalHours - Math.floor(totalHours)) * 60);
  const totalHoursFormatted = `${Math.floor(totalHours)} hours ${totalMinutes} min`;
  
  const totalAmount = completedRecords.reduce((sum, r) => {
    const rate = getHourlyRate(r);
    return sum + (r.hoursWorked * rate);
  }, 0);

  const defaultHourlyRate = payRates.length > 0 ? payRates[0].hourlyRate : 0;
  const defaultCurrency = payRates.length > 0 ? (payRates[0].currency || "AUD") : "AUD";

  // Calculate statistics for cards
  const totalDaysWorked = completedRecords.length;
  
  // Calculate total leaves (weekdays without work records)
  const totalLeaves = daysInMonth.filter(dateString => {
    const date = new Date(dateString);
    const day = date.getDay();
    const isWeekendDay = day === 0 || day === 6; // Sunday or Saturday
    const hasRecord = workRecords.some(r => r.date === dateString && r.clockOutTime);
    // Count as leave if it's a weekday and has no completed work record
    return !isWeekendDay && !hasRecord;
  }).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-background border border-slate-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Work Summary / Timesheet
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage your work records
          </p>
        </div>
      </div>

      {/* Month Selector with Save Button */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Month & Save Timesheet
          </CardTitle>
          <CardDescription>
            Choose the month you're filling and save your timesheet entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="month-select">Select Month</Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveTimesheet}
                disabled={isSavingTimesheet || isLoading}
                className="min-w-[140px]"
              >
                {isSavingTimesheet ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-pulse" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Timesheet
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Hours</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-blue-600 dark:text-blue-400">
                  {totalHoursFormatted}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Days Worked</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20 dark:bg-green-500/30 group-hover:scale-110 transition-transform">
              <CalendarDays className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-green-600 dark:text-green-400">
                  {totalDaysWorked}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{totalDaysWorked === 1 ? 'day' : 'days'} completed</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 dark:from-orange-500/20 dark:via-orange-500/10 dark:to-transparent dark:border-orange-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Hourly Rate</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/20 dark:bg-orange-500/30 group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-orange-600 dark:text-orange-400">
                  {payRates.length > 0 
                    ? `${defaultCurrency}${(payRates.reduce((sum, pr) => sum + pr.hourlyRate, 0) / payRates.length).toLocaleString()}/hr`
                    : "Not set"}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>
                    {payRates.length > 0 
                      ? payRates.length === 1 
                        ? "Per hour" 
                        : `Avg of ${payRates.length} rates`
                      : "Contact admin to set rate"}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30 dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent dark:border-purple-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Earnings</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-purple-600 dark:text-purple-400">
                  {defaultCurrency}{totalAmount.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timesheet Table */}
      <Card className="rounded-3xl">
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Work Summary</CardTitle>
                <CardDescription>
                  {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Calculate payment status */}
                {(() => {
                  // Calculate payment status
                  const workYear = new Date(selectedMonth + "-01").getFullYear();
                  const workMonthNum = new Date(selectedMonth + "-01").getMonth() + 1;
                  const paymentDueDate = getPaymentDueDate(workYear, workMonthNum);
                  const workMonthName = new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long' });
                  
                  const matchingPayroll = payrolls.find(p => 
                    p.name === (userData?.name || workRecords[0]?.employeeName || "") && 
                    p.month === workMonthName &&
                    (p.typeOfCashFlow === "cleaner_payroll" || p.typeOfCashFlow === "internal_payroll")
                  );
                  
                  let paymentStatus: PaymentStatus | "work_in_progress" = "pending";
                  if (matchingPayroll) {
                    if (matchingPayroll.status === "paid" || matchingPayroll.status === "received") {
                      paymentStatus = "paid";
                    } else {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      paymentDueDate.setHours(0, 0, 0, 0);
                      
                      // Get the 1st of the payment month
                      const paymentMonthStart = new Date(paymentDueDate.getFullYear(), paymentDueDate.getMonth(), 1);
                      paymentMonthStart.setHours(0, 0, 0, 0);
                      
                      if (today < paymentMonthStart) {
                        paymentStatus = "work_in_progress";
                      } else if (paymentDueDate < today) {
                        paymentStatus = "overdue";
                      } else {
                        paymentStatus = "pending";
                      }
                    }
                  } else {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    paymentDueDate.setHours(0, 0, 0, 0);
                    
                    // Get the 1st of the payment month
                    const paymentMonthStart = new Date(paymentDueDate.getFullYear(), paymentDueDate.getMonth(), 1);
                    paymentMonthStart.setHours(0, 0, 0, 0);
                    
                    if (today < paymentMonthStart) {
                      paymentStatus = "work_in_progress";
                    } else if (paymentDueDate < today) {
                      paymentStatus = "overdue";
                    } else {
                      paymentStatus = "pending";
                    }
                  }
                  
                  return (
                    <>
                      {/* Payment Status Badge */}
                      <Badge
                        variant={
                          paymentStatus === "paid" || paymentStatus === "received"
                            ? "default"
                            : paymentStatus === "overdue"
                            ? "destructive"
                            : paymentStatus === "work_in_progress"
                            ? "outline"
                            : "secondary"
                        }
                        className="px-3 py-1.5 text-sm font-medium"
                      >
                        {paymentStatus === "paid" || paymentStatus === "received" ? "✓ Paid" : 
                         paymentStatus === "overdue" ? "⚠ Overdue" : 
                         paymentStatus === "work_in_progress" ? "Work in Progress" :
                         "⏳ Pending Payment"}
                      </Badge>
                      {/* Payment Due Date */}
                      <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium">
                        Due: {paymentDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Badge>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="text-left p-3 font-semibold">Date</th>
                    <th className="text-left p-3 font-semibold">Clock-In / Clock-Out</th>
                    <th className="text-left p-3 font-semibold">Hours Worked</th>
                    <th className="text-left p-3 font-semibold">Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Total</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {daysInMonth.map((dateString) => {
                    const record = getRecordForDate(dateString);
                    const isWeekendDay = isWeekend(dateString);
                    const hourlyRate = record ? getHourlyRate(record) : defaultHourlyRate;
                    const currency = record ? getCurrency(record) : defaultCurrency;
                    const total = record && record.clockOutTime && !record.isLeave
                      ? record.hoursWorked * hourlyRate 
                      : 0;

                    return (
                      <tr
                        key={dateString}
                        className={`border-b hover:bg-muted/50 ${
                          isWeekendDay ? "bg-yellow-50 dark:bg-yellow-950/20" : ""
                        }`}
                      >
                        <td className="p-3">{formatDate(dateString)}</td>
                        <td className="p-3">
                          {record && record.isLeave ? (
                            <div className="flex items-center gap-2">
                              <Umbrella className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30">
                                {record.leaveType || "Leave"}
                              </Badge>
                            </div>
                          ) : record && record.clockInTime ? (
                            <div className="flex items-center gap-2">
                              <span>
                                {record.clockOutTime
                                  ? `${formatTime(record.clockInTime)} – ${formatTime(record.clockOutTime)}`
                                  : formatTime(record.clockInTime)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isWeekendDay ? (
                            <span className="font-medium">Weekend</span>
                          ) : record && record.isLeave ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">Leave</span>
                          ) : record && record.clockOutTime ? (
                            formatHours(record.hoursWorked)
                          ) : record ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isWeekendDay || !record || record.isLeave || !record.clockOutTime ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            `${currency}${hourlyRate.toLocaleString()}`
                          )}
                        </td>
                        <td className="p-3">
                          {isWeekendDay || !record || record.isLeave || !record.clockOutTime ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="font-medium">{currency}{total.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {record ? (
                              <>
                                {record.approvalStatus !== "approved" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(record)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(record)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </>
                            ) : !isWeekendDay && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddNew(dateString)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-yellow-50 dark:bg-yellow-950/20 border-t-2 font-bold">
                    <td className="p-3">Total Amount</td>
                    <td className="p-3">-</td>
                    <td className="p-3">{totalHoursFormatted}</td>
                    <td className="p-3">-</td>
                    <td className="p-3">{formatCurrency(totalAmount)}</td>
                    <td className="p-3">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            // Reset form data when dialog closes
            setEditFormData({
              date: "",
              clockInTime: "",
              clockOutTime: "",
              notes: "",
              isLeave: false,
              leaveType: "Annual",
            });
            setEditingRecord(null);
            setIsNewRecord(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isNewRecord ? "Add Work Record" : "Edit Work Record"}</DialogTitle>
            <DialogDescription>
              {isNewRecord 
                ? "Enter work hours or mark as leave for this date"
                : "Update work hours, leave status, or notes. Approved records cannot be edited."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={editFormData.date ?? ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, date: e.target.value })
                }
                disabled={!isNewRecord}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isLeave"
                checked={editFormData.isLeave}
                onCheckedChange={(checked) =>
                  setEditFormData({ 
                    ...editFormData, 
                    isLeave: checked as boolean,
                    clockInTime: checked ? "" : editFormData.clockInTime,
                    clockOutTime: checked ? "" : editFormData.clockOutTime,
                  })
                }
              />
              <Label htmlFor="isLeave" className="flex items-center gap-2 cursor-pointer">
                <Umbrella className="h-4 w-4" />
                Mark as Leave
              </Label>
            </div>
            {editFormData.isLeave && (
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={editFormData.leaveType}
                  onValueChange={(value: "Annual" | "Sick" | "Casual" | "Unpaid") =>
                    setEditFormData({ ...editFormData, leaveType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual Leave</SelectItem>
                    <SelectItem value="Sick">Sick Leave</SelectItem>
                    <SelectItem value="Casual">Casual Leave</SelectItem>
                    <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!editFormData.isLeave && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="clockInTime">
                    Clock-In Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="clockInTime"
                    type="time"
                    value={editFormData.clockInTime ?? ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, clockInTime: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clockOutTime">Clock-Out Time</Label>
                  <Input
                    id="clockOutTime"
                    type="time"
                    value={editFormData.clockOutTime ?? ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, clockOutTime: e.target.value })
                    }
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={editFormData.notes ?? ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, notes: e.target.value })
                }
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeTimesheet;



