"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, DollarSign, Search, Download, User, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getAllWorkRecords } from "@/lib/firebase/workRecords";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getEmployeePayRatesByEmployee } from "@/lib/firebase/employeePayRates";
import { getAllUsers } from "@/lib/firebase/users";
import { getAllPayrolls, updatePayroll } from "@/lib/firebase/payroll";
import { getAllInvoices, updateInvoice } from "@/lib/firebase/invoices";
import { WorkRecord, Employee, Payroll, PaymentStatus } from "@/types/financial";
import { formatCurrency } from "@/lib/utils";
import { calculatePaymentDueDate } from "@/lib/paymentReminders";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EmployeeTimesheetsAdmin = () => {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [allWorkRecords, setAllWorkRecords] = useState<WorkRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [employeePayRates, setEmployeePayRates] = useState<Record<string, any[]>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [updatingPayrollId, setUpdatingPayrollId] = useState<string | null>(null);

  useEffect(() => {
    if (userData) {
      loadData();
    }
  }, [userData, selectedMonth, selectedEmployeeId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Parse month
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

      // Load all work records for the selected month
      const records = await getAllWorkRecords(startDate, endDate);
      
      // Filter by employee if selected
      let filteredRecords = records;
      if (selectedEmployeeId !== "all") {
        filteredRecords = records.filter(r => r.employeeId === selectedEmployeeId);
      }
      
      setAllWorkRecords(filteredRecords);

      // Load all employees, users, and payrolls
      const [allEmployees, users, allPayrolls] = await Promise.all([
        getAllEmployees(),
        getAllUsers(),
        getAllPayrolls(),
      ]);
      setPayrolls(allPayrolls);
      
      // Filter out clients and admins
      const actualEmployees = allEmployees.filter(
        (emp) => {
          if (emp.type && emp.type !== "employee") return false;
          if (emp.role && emp.role.toLowerCase() === "admin") return false;
          return true;
        }
      );
      setEmployees(actualEmployees);
      setAllUsers(users);
    } catch (error) {
      console.error("Error loading timesheet data:", error);
      toast.error("Failed to load timesheet data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadPayRates = async () => {
      const ratesMap: Record<string, any[]> = {};
      for (const emp of employees) {
        try {
          const rates = await getEmployeePayRatesByEmployee(emp.id);
          ratesMap[emp.id] = rates;
        } catch (error) {
          console.error(`Error loading pay rates for ${emp.id}:`, error);
        }
      }
      setEmployeePayRates(ratesMap);
    };
    if (employees.length > 0) {
      loadPayRates();
    }
  }, [employees]);

  // Group records by employee (using Firebase Auth UID from work records)
  const groupedByEmployeeId = allWorkRecords.reduce((acc, record) => {
    if (!acc[record.employeeId]) {
      acc[record.employeeId] = [];
    }
    acc[record.employeeId].push(record);
    return acc;
  }, {} as Record<string, WorkRecord[]>);

  // Create a map of Firebase Auth UID to Employee record
  // Work records use Firebase Auth UID, so we need to match employees by their user account
  const employeeIdToEmployeeMap = new Map<string, Employee>();
  employees.forEach(emp => {
    // Try to find user by email to get Firebase Auth UID
    const user = allUsers.find(u => u.email?.toLowerCase() === emp.email?.toLowerCase());
    if (user) {
      employeeIdToEmployeeMap.set(user.uid, emp);
    }
    // Also map by employee document ID (in case work records use employee ID instead of Firebase UID)
    employeeIdToEmployeeMap.set(emp.id, emp);
  });

  // Calculate statistics for ALL employees (not just those with records)
  const employeeStats = employees.map(employee => {
    // Find work records for this employee
    // Try to match by Firebase Auth UID first
    const user = allUsers.find(u => u.email?.toLowerCase() === employee.email?.toLowerCase());
    const firebaseUid = user?.uid;
    
    // Find records by Firebase UID or employee ID
    let records: WorkRecord[] = [];
    if (firebaseUid && groupedByEmployeeId[firebaseUid]) {
      records = groupedByEmployeeId[firebaseUid];
    } else if (groupedByEmployeeId[employee.id]) {
      records = groupedByEmployeeId[employee.id];
    } else {
      // Try matching by name as fallback
      const matchingRecords = allWorkRecords.filter(r => 
        r.employeeName === employee.name || 
        r.employeeName === employee.email
      );
      if (matchingRecords.length > 0) {
        records = matchingRecords;
      }
    }

    const completedRecords = records.filter(r => r.clockOutTime);
    const totalHours = completedRecords.reduce((sum, r) => sum + r.hoursWorked, 0);
    const totalDays = completedRecords.length;

    // Get hourly rate and currency for this employee
    let hourlyRate = 0;
    let currency = "AUD"; // Default currency
    const rates = employeePayRates[employee.id] || [];
    if (rates.length > 0) {
      hourlyRate = rates.reduce((sum, pr) => sum + pr.hourlyRate, 0) / rates.length;
      // Get currency from the first pay rate (assuming all rates for an employee use the same currency)
      currency = rates[0].currency || "AUD";
    }

    // Calculate total earnings
    const totalEarnings = completedRecords.reduce((sum, r) => {
      return sum + (r.hoursWorked * hourlyRate);
    }, 0);

    return {
      employeeId: firebaseUid || employee.id,
      employeeName: employee.name,
      employee,
      records,
      totalHours,
      totalDays,
      totalRecords: records.length,
      hourlyRate,
      totalEarnings,
      currency,
    };
  });

  // Filter by search query and only show employees with at least one record
  const filteredStats = employeeStats.filter(stat => {
    // Only show employees who have at least one timesheet record
    if (stat.totalRecords === 0) return false;
    
    // Apply search filter if query exists
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      stat.employeeName.toLowerCase().includes(query) ||
      stat.employee?.email?.toLowerCase().includes(query)
    );
  });

  // Format time for display
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate payment due date: 15th of the month following the work month
  const getPaymentDueDate = (workYear: number, workMonth: number): Date => {
    // Get the first day of the following month
    const followingMonth = workMonth === 12 ? 1 : workMonth + 1;
    const followingYear = workMonth === 12 ? workYear + 1 : workYear;
    // Set to the 15th of the following month
    return new Date(followingYear, followingMonth - 1, 15);
  };

  // Calculate payment status and due date for a work record
  // Payment is due on the 15th of the month following the work month
  const getPaymentInfo = (record: WorkRecord, employeeName: string): { status: PaymentStatus | "work_in_progress"; dueDate: Date | null } => {
    const workDate = new Date(record.date);
    const workYear = workDate.getFullYear();
    const workMonth = workDate.getMonth() + 1; // 1-12
    const workMonthName = workDate.toLocaleDateString('en-US', { month: 'long' });
    
    // Calculate payment due date: 15th of the following month
    const dueDate = getPaymentDueDate(workYear, workMonth);
    
    // Look for payroll record matching this employee and month
    const matchingPayroll = payrolls.find(p => 
      p.name === employeeName && 
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

  // Handle marking employee as paid
  const handleMarkAsPaid = async (stat: any, matchingPayroll: Payroll | undefined, workMonth: string, workYear: number) => {
    try {
      if (matchingPayroll) {
        // Update existing payroll record
        setUpdatingPayrollId(matchingPayroll.id);
        await updatePayroll(matchingPayroll.id, { 
          status: "paid",
          paymentDate: new Date().toISOString().split('T')[0], // Set payment date to today
        });
        
        // If there's an invoice number, also update the related invoice
        if (matchingPayroll.invoiceNumber) {
          try {
            const invoices = await getAllInvoices();
            const relatedInvoice = invoices.find(inv => inv.invoiceNumber === matchingPayroll.invoiceNumber);
            if (relatedInvoice && relatedInvoice.status !== "paid" && relatedInvoice.status !== "received") {
              await updateInvoice(relatedInvoice.id, { 
                status: "paid",
                paymentDate: new Date().toISOString().split('T')[0],
              });
            }
          } catch (invoiceError) {
            console.error("Error updating related invoice:", invoiceError);
            // Don't fail the whole operation if invoice update fails
          }
        }
      } else {
        // No payroll record exists - try to find or create one
        // First, try to find an invoice for this employee and month
        const invoices = await getAllInvoices();
        const workMonthName = new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long' });
        const relatedInvoice = invoices.find(inv => 
          (inv.name === stat.employeeName || inv.clientName === stat.employeeName) &&
          new Date(inv.issueDate).toLocaleDateString('en-US', { month: 'long' }) === workMonthName
        );
        
        if (relatedInvoice) {
          // Update the invoice status
          setUpdatingPayrollId(`invoice-${relatedInvoice.id}`);
          await updateInvoice(relatedInvoice.id, { 
            status: "paid",
            paymentDate: new Date().toISOString().split('T')[0],
          });
          toast.info("Invoice marked as paid. Payroll record will be created automatically.");
        } else {
          toast.error("No payroll or invoice record found. Please create a payroll record first.");
          setUpdatingPayrollId(null);
          return;
        }
      }
      
      // Reload data to reflect the change
      await loadData();
      
      toast.success(`${stat.employeeName} has been marked as paid`);
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      toast.error(error.message || "Failed to update payment status");
    } finally {
      setUpdatingPayrollId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Employee Timesheets</h2>
        <p className="text-muted-foreground">View and manage all employee work records</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Filter by Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employeeStats.map((stat) => (
                    <SelectItem key={stat.employeeId} value={stat.employeeId}>
                      {stat.employeeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Employees Card */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Employees</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 group-hover:scale-110 transition-transform">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-blue-600 dark:text-blue-400">
                  {filteredStats.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  With timesheet records
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Records Card */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Records</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20 dark:bg-green-500/30 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-green-600 dark:text-green-400">
                  {allWorkRecords.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Work entries this month
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Hours Card */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 dark:from-orange-500/20 dark:via-orange-500/10 dark:to-transparent dark:border-orange-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Hours</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/20 dark:bg-orange-500/30 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-orange-600 dark:text-orange-400">
                  {allWorkRecords
                    .filter(r => r.clockOutTime)
                    .reduce((sum, r) => sum + r.hoursWorked, 0)
                    .toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Hours worked
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Month Card */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30 dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent dark:border-purple-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Selected Month</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-lg font-bold mb-1 text-purple-600 dark:text-purple-400">
              {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="text-xs text-muted-foreground">
              Current view
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Timesheets</CardTitle>
          <CardDescription>
            {new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No timesheet records found for the selected month</p>
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              {filteredStats.map((stat) => {
                const completedRecords = stat.records.filter(r => r.clockOutTime);
                const totalAmount = completedRecords.reduce((sum, r) => {
                  // Calculate earnings based on hours worked
                  // Note: This is a simplified calculation - you may want to use actual pay rates
                  const avgRate = 25; // Default rate, should be fetched from pay rates
                  return sum + (r.hoursWorked * avgRate);
                }, 0);

                // Calculate overall payment status for this employee's month
                const workMonth = new Date(selectedMonth + "-01").toLocaleDateString('en-US', { month: 'long' });
                const workMonthName = workMonth;
                const workYear = new Date(selectedMonth + "-01").getFullYear();
                const workMonthNum = new Date(selectedMonth + "-01").getMonth() + 1;
                const paymentDueDate = getPaymentDueDate(workYear, workMonthNum);
                
                // Find matching payroll for payment status
                const matchingPayroll = payrolls.find(p => 
                  p.name === stat.employeeName && 
                  p.month === workMonth &&
                  (p.typeOfCashFlow === "cleaner_payroll" || p.typeOfCashFlow === "internal_payroll")
                );
                
                let paymentStatus: PaymentStatus | "work_in_progress" = "pending";
                if (matchingPayroll) {
                  if (matchingPayroll.status === "paid" || matchingPayroll.status === "received") {
                    paymentStatus = matchingPayroll.status;
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
                  <Card key={stat.employeeId} className="border-2 mt-6">
                    <CardHeader className="pt-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <CardTitle className="text-xl">{stat.employeeName}</CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
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
                              {/* Mark as Paid Button - Only show when not already paid */}
                              {paymentStatus !== "paid" && 
                               paymentStatus !== "received" && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleMarkAsPaid(stat, matchingPayroll, workMonthName, workYear)}
                                  disabled={updatingPayrollId === (matchingPayroll?.id || `invoice-${stat.employeeId}`)}
                                  className="gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-medium rounded-full"
                                >
                                  {updatingPayrollId === (matchingPayroll?.id || `invoice-${stat.employeeId}`) ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Updating...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-4 w-4" />
                                      Mark as Paid
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-lg px-4 py-2">
                            {stat.totalRecords} {stat.totalRecords === 1 ? 'record' : 'records'}
                          </Badge>
                        </div>
                        {stat.employee?.email && (
                          <CardDescription>{stat.employee.email}</CardDescription>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Total Hours</div>
                          <div className="text-2xl font-bold">{stat.totalHours.toFixed(1)}</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Days Worked</div>
                          <div className="text-2xl font-bold">{stat.totalDays}</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Hourly Rate</div>
                          <div className="text-2xl font-bold">
                            {stat.hourlyRate > 0 
                              ? `${stat.currency || "AUD"}${stat.hourlyRate.toLocaleString()}/hr`
                              : "Not set"}
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Total Earnings</div>
                          <div className="text-2xl font-bold">{stat.currency || "AUD"}{stat.totalEarnings.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Clock-In</TableHead>
                              <TableHead>Clock-Out</TableHead>
                              <TableHead>Hours</TableHead>
                              <TableHead>Site</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stat.records
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell>{formatDate(record.date)}</TableCell>
                                  <TableCell>{formatTime(record.clockInTime)}</TableCell>
                                  <TableCell>
                                    {record.clockOutTime ? formatTime(record.clockOutTime) : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {record.hoursWorked > 0 ? `${record.hoursWorked.toFixed(2)}h` : "-"}
                                  </TableCell>
                                  <TableCell>
                                    {record.siteName || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeTimesheetsAdmin;

