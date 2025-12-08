"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/SearchFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar as CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, RefreshCw, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { PaymentStatus, PaymentMethod, Payroll, CashFlowMode, Invoice } from "@/types/financial";
import { getPayrollsByHistoryStatus, movePaidInvoicesToHistory } from "@/lib/firebase/payroll";
import { getAllInvoices } from "@/lib/firebase/invoices";
import { toast } from "sonner";
import { generateMonthlyReport } from "@/lib/monthly-report-generator";

const InvoiceHistory = () => {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Check if we need to move paid invoices to history (run once per day)
        const lastMoveCheck = localStorage.getItem('lastHistoryMoveCheck');
        const today = new Date().toDateString();
        if (!lastMoveCheck || lastMoveCheck !== today) {
          try {
            const movedCount = await movePaidInvoicesToHistory();
            localStorage.setItem('lastHistoryMoveCheck', today);
            if (movedCount > 0) {
              console.log(`Moved ${movedCount} paid invoices to history`);
            }
          } catch (error) {
            console.error("Error moving paid invoices to history:", error);
            // Don't block the UI if this fails
          }
        }
        
        // Fetch all payrolls that are in history and all invoices for profit calculation
        const [fetchedPayrolls, fetchedInvoices] = await Promise.all([
          getPayrollsByHistoryStatus(true),
          getAllInvoices()
        ]);
        console.log(`Loaded ${fetchedPayrolls.length} payroll records from history`);
        console.log(`Loaded ${fetchedInvoices.length} invoice records`);
        setPayrolls(fetchedPayrolls);
        setInvoices(fetchedInvoices);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Parse date from DD.MM.YYYY format
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

  // Filter payrolls
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter(payroll => {
      const matchesSearch = payroll.invoiceNumber?.toLowerCase().includes(searchValue.toLowerCase()) ||
        payroll.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (payroll.siteOfWork && payroll.siteOfWork.toLowerCase().includes(searchValue.toLowerCase()));
      const matchesStatus = statusFilter === "all" || payroll.status === statusFilter;
      
      // Date range filtering - use movedToHistoryAt date for history view
      let matchesDate = true;
      if (dateRange?.from || dateRange?.to) {
        let dateToCheck: Date | null = null;
        
        if (payroll.movedToHistoryAt) {
          // Filter by when it was moved to history
          dateToCheck = new Date(payroll.movedToHistoryAt);
        }
        
        if (dateToCheck) {
          if (dateRange.from && dateRange.to) {
            matchesDate = dateToCheck >= dateRange.from && dateToCheck <= dateRange.to;
          } else if (dateRange.from) {
            matchesDate = dateToCheck >= dateRange.from;
          } else if (dateRange.to) {
            matchesDate = dateToCheck <= dateRange.to;
          }
        } else {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [payrolls, searchValue, statusFilter, dateRange]);

  // Calculate monthly profit summaries
  // Revenue from invoices (received status) and expenses from payroll outflows (received status)
  const monthlySummaries = useMemo(() => {
    const summaries: Record<string, { revenue: number; expenses: number; profit: number; month: string; year: number }> = {};
    
    // Process invoices for revenue
    invoices.forEach(invoice => {
      if (invoice.status !== "received") return;
      
      const invoiceDate = new Date(invoice.issueDate);
      const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = format(invoiceDate, "MMMM yyyy");
      
      if (!summaries[monthKey]) {
        summaries[monthKey] = {
          revenue: 0,
          expenses: 0,
          profit: 0,
          month: monthName,
          year: invoiceDate.getFullYear(),
        };
      }
      
      summaries[monthKey].revenue += invoice.totalAmount;
    });
    
    // Process payroll outflows for expenses
    payrolls.forEach(payroll => {
      if (payroll.modeOfCashFlow !== "outflow" || payroll.status !== "received") return;
      
      const dateToUse = parseDate(payroll.date);
      if (!dateToUse) return;
      
      const monthKey = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`;
      const monthName = format(dateToUse, "MMMM yyyy");
      
      if (!summaries[monthKey]) {
        summaries[monthKey] = {
          revenue: 0,
          expenses: 0,
          profit: 0,
          month: monthName,
          year: dateToUse.getFullYear(),
        };
      }
      
      summaries[monthKey].expenses += payroll.totalAmount;
    });
    
    // Calculate profit for each month
    Object.keys(summaries).forEach(key => {
      summaries[key].profit = summaries[key].revenue - summaries[key].expenses;
    });
    
    // Convert to array and sort by date (newest first)
    return Object.values(summaries).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB.getTime() - dateA.getTime();
    });
  }, [invoices, payrolls]);

  // Calculate totals from payrolls (cash flow)
  const totalInflow = useMemo(() => {
    return filteredPayrolls
      .filter(p => p.modeOfCashFlow === "inflow")
      .reduce((sum, p) => sum + p.totalAmount, 0);
  }, [filteredPayrolls]);

  const totalOutflow = useMemo(() => {
    return filteredPayrolls
      .filter(p => p.modeOfCashFlow === "outflow")
      .reduce((sum, p) => sum + p.totalAmount, 0);
  }, [filteredPayrolls]);

  const netCashFlow = totalInflow - totalOutflow;

  // Calculate profit from invoices (revenue) and payroll (expenses)
  // Revenue = invoices with status "received"
  // Expenses = payroll outflows with status "received"
  const totalRevenue = useMemo(() => {
    return invoices
      .filter(inv => inv.status === "received")
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [invoices]);

  const totalExpenses = useMemo(() => {
    return payrolls
      .filter(pay => pay.modeOfCashFlow === "outflow" && pay.status === "received")
      .reduce((sum, pay) => sum + pay.totalAmount, 0);
  }, [payrolls]);

  const totalProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-background border border-purple-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Invoice History
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">View historical invoices and monthly cash flow analytics</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setIsLoading(true);
                  // Refresh data before generating report
                  const fetchedPayrolls = await getPayrollsByHistoryStatus(true);
                  setPayrolls(fetchedPayrolls);
                  
                  const monthLabel = dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                    : dateRange?.from
                    ? format(dateRange.from, "MMMM yyyy")
                    : "All History";
                  
                  await generateMonthlyReport(fetchedPayrolls, monthLabel, "/logo/skillcityyy.png");
                  toast.success("Monthly report downloaded successfully!");
                } catch (error: any) {
                  console.error("Error generating report:", error);
                  toast.error(error.message || "Failed to generate report. Please try again.");
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || filteredPayrolls.length === 0}
              className="shadow-md hover:shadow-lg transition-all duration-300 border-2"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setIsLoading(true);
                  // Force refresh by moving paid invoices and reloading
                  await movePaidInvoicesToHistory();
                  const [fetchedPayrolls, fetchedInvoices] = await Promise.all([
                    getPayrollsByHistoryStatus(true),
                    getAllInvoices()
                  ]);
                  setPayrolls(fetchedPayrolls);
                  setInvoices(fetchedInvoices);
                  toast.success(`Refreshed! Loaded ${fetchedPayrolls.length} payroll and ${fetchedInvoices.length} invoice records.`);
                } catch (error) {
                  console.error("Error refreshing data:", error);
                  toast.error("Failed to refresh data. Please try again.");
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="shadow-md hover:shadow-lg transition-all duration-300 border-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Profit Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-200 dark:border-green-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-green-400/30 transition-colors"></div>
          <CardHeader className="relative px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Revenue</CardTitle>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400 mt-2">
              {formatCurrency(totalRevenue)}
            </div>
          </CardHeader>
          <CardContent className="bg-green-50/50 dark:bg-green-950/20 rounded-b-2xl px-6 py-4 border-t border-green-200 dark:border-green-900/50">
            <p className="text-xs text-muted-foreground font-medium">From received invoices</p>
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
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Expenses</CardTitle>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400 mt-2">
              {formatCurrency(totalExpenses)}
            </div>
          </CardHeader>
          <CardContent className="bg-red-50/50 dark:bg-red-950/20 rounded-b-2xl px-6 py-4 border-t border-red-200 dark:border-red-900/50">
            <p className="text-xs text-muted-foreground font-medium">From received payroll outflows</p>
          </CardContent>
        </Card>
        <Card className={`relative overflow-hidden bg-gradient-to-br ${totalProfit >= 0 ? 'from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-900/50' : 'from-red-50 to-rose-100/50 dark:from-red-950/30 dark:to-rose-900/20 border-2 border-red-200 dark:border-red-900/50'} shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group`}>
          <div className={`absolute top-0 right-0 w-32 h-32 ${totalProfit >= 0 ? 'bg-green-400/20 group-hover:bg-green-400/30' : 'bg-red-400/20 group-hover:bg-red-400/30'} rounded-full -mr-16 -mt-16 transition-colors`}></div>
          <CardHeader className="relative px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${totalProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} shadow-lg`}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Net Profit</CardTitle>
            <div className={`text-3xl font-bold mt-2 ${totalProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {formatCurrency(totalProfit)}
            </div>
          </CardHeader>
          <CardContent className={`${totalProfit >= 0 ? 'bg-green-50/50 dark:bg-green-950/20 border-t border-green-200 dark:border-green-900/50' : 'bg-red-50/50 dark:bg-red-950/20 border-t border-red-200 dark:border-red-900/50'} rounded-b-2xl px-6 py-4`}>
            <p className="text-xs text-muted-foreground font-medium">Revenue minus expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Monthly Profit Summary Table */}
      {monthlySummaries.length > 0 && (
        <Card className="border-2 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-muted/30 border-b-2 pb-4">
            <CardTitle className="text-xl font-bold">Monthly Profit Summary</CardTitle>
            <CardDescription className="text-sm">Revenue, expenses, and profit breakdown by month</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-green-500/20 via-emerald-500/10 to-green-500/5 border-b-2">
                    <TableHead className="font-bold text-foreground">Month</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Revenue</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Expenses</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummaries.map((summary, index) => {
                    return (
                      <TableRow 
                        key={index} 
                        className="hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent transition-all duration-200 border-b"
                      >
                        <TableCell className="font-semibold">{summary.month}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-bold">
                          {formatCurrency(summary.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400 font-bold">
                          {formatCurrency(summary.expenses)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${summary.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(summary.profit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Invoice History Table */}
      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-muted/30 border-b-2 pb-4">
          <CardTitle className="text-xl font-bold">Invoice History</CardTitle>
          <CardDescription className="text-sm">View all historical invoices and payments</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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
                  className="w-[280px] justify-start text-left font-normal border-2 hover:border-primary transition-all duration-200"
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
                    <span>Pick a date range (history date)</span>
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

          <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-purple-500/5 border-b-2">
                  <TableHead className="font-bold text-foreground">Invoice #</TableHead>
                  <TableHead className="font-bold text-foreground">Name</TableHead>
                  <TableHead className="font-bold text-foreground">Site of Work</TableHead>
                  <TableHead className="font-bold text-foreground">Type</TableHead>
                  <TableHead className="font-bold text-foreground">Amount</TableHead>
                  <TableHead className="font-bold text-foreground">GST</TableHead>
                  <TableHead className="font-bold text-foreground">Total</TableHead>
                  <TableHead className="font-bold text-foreground">Issue Date</TableHead>
                  <TableHead className="font-bold text-foreground">Status</TableHead>
                  <TableHead className="font-bold text-foreground">Payment Method</TableHead>
                  <TableHead className="font-bold text-foreground">Payment Date</TableHead>
                  <TableHead className="font-bold text-foreground">Moved to History</TableHead>
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
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredPayrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayrolls.map((payroll) => (
                    <TableRow 
                      key={payroll.id}
                      className="hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-transparent transition-all duration-200 border-b group"
                    >
                      <TableCell className="font-semibold">
                        {payroll.invoiceNumber ? (
                          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-mono text-sm">
                            {payroll.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{payroll.name || "-"}</TableCell>
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
                          variant={payroll.modeOfCashFlow === "inflow" ? "default" : "secondary"}
                          className={payroll.modeOfCashFlow === "inflow" 
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                            : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"}
                        >
                          {payroll.modeOfCashFlow === "inflow" ? "Inflow" : "Outflow"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {formatCurrency(payroll.amountExclGst)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(payroll.gstAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(payroll.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(payroll.date)}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payroll.status} />
                      </TableCell>
                      <TableCell>
                        {payroll.paymentMethod ? (
                          <Badge variant="outline" className="text-xs">
                            {payroll.paymentMethod === "bank_transfer" ? "Bank Transfer" :
                             payroll.paymentMethod === "cash" ? "Cash" :
                             payroll.paymentMethod === "cheque" ? "Cheque" :
                             payroll.paymentMethod === "credit_card" ? "Credit Card" : "Other"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payroll.paymentDate ? (
                          <span className="text-sm">{formatDate(payroll.paymentDate)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payroll.movedToHistoryAt 
                          ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDate(new Date(payroll.movedToHistoryAt).toISOString().split('T')[0])}
                            </span>
                          )
                          : (
                            <span className="text-muted-foreground">-</span>
                          )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceHistory;

