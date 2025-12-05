"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/SearchFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar as CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { PaymentStatus, PaymentMethod, Payroll, CashFlowMode } from "@/types/financial";
import { getPayrollsByHistoryStatus, movePaidInvoicesToHistory } from "@/lib/firebase/payroll";
import { toast } from "sonner";
import { generateMonthlyReport } from "@/lib/monthly-report-generator";

const InvoiceHistory = () => {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
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
            await movePaidInvoicesToHistory();
            localStorage.setItem('lastHistoryMoveCheck', today);
          } catch (error) {
            console.error("Error moving paid invoices to history:", error);
            // Don't block the UI if this fails
          }
        }
        
        const fetchedPayrolls = await getPayrollsByHistoryStatus(true);
        setPayrolls(fetchedPayrolls);
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

  // Calculate monthly cash flow summaries
  // IMPORTANT: Payments are attributed to the month when work was performed, not when payment was received
  // Example: Jordan works in November, gets paid on December 15th -> Payment belongs to November
  const monthlySummaries = useMemo(() => {
    const summaries: Record<string, { inflow: number; outflow: number; month: string; year: number }> = {};
    
    filteredPayrolls.forEach(payroll => {
      // Always use work date (invoice date) to determine the month
      // Payments belong to the month when work was done, not when payment was received
      // Example: Work done in November, paid in December -> belongs to November
      const dateToUse = parseDate(payroll.date);
      
      if (!dateToUse) return;
      
      const monthKey = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`;
      const monthName = format(dateToUse, "MMMM yyyy");
      
      if (!summaries[monthKey]) {
        summaries[monthKey] = {
          inflow: 0,
          outflow: 0,
          month: monthName,
          year: dateToUse.getFullYear(),
        };
      }
      
      if (payroll.modeOfCashFlow === "inflow") {
        summaries[monthKey].inflow += payroll.totalAmount;
      } else if (payroll.modeOfCashFlow === "outflow") {
        summaries[monthKey].outflow += payroll.totalAmount;
      }
    });
    
    // Convert to array and sort by date (newest first)
    return Object.values(summaries).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredPayrolls]);

  // Calculate totals
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Invoice History</h2>
          <p className="text-sm sm:text-base text-muted-foreground">View historical invoices and monthly cash flow</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const monthLabel = dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                  : dateRange?.from
                  ? format(dateRange.from, "MMMM yyyy")
                  : "All History";
                
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
            Download Report
          </Button>
        </div>
      </div>

      {/* Monthly Cash Flow Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Inflow</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Outflow</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary Table */}
      {monthlySummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cash Flow Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50 dark:bg-green-950">
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Cash Inflow</TableHead>
                    <TableHead className="text-right">Cash Outflow</TableHead>
                    <TableHead className="text-right">Net Flow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummaries.map((summary, index) => {
                    const netFlow = summary.inflow - summary.outflow;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{summary.month}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          ${summary.inflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          ${summary.outflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${netFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Invoice History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
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

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50 dark:bg-green-950">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Site of Work</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Moved to History</TableHead>
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
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{payroll.invoiceNumber || "-"}</TableCell>
                      <TableCell className="font-medium">{payroll.name || "-"}</TableCell>
                      <TableCell>{payroll.siteOfWork || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={payroll.modeOfCashFlow === "inflow" ? "default" : "secondary"}>
                          {payroll.modeOfCashFlow === "inflow" ? "Inflow" : "Outflow"}
                        </Badge>
                      </TableCell>
                      <TableCell>${payroll.amountExclGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>${payroll.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="font-semibold">${payroll.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>{formatDate(payroll.date)}</TableCell>
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
                      <TableCell>
                        {payroll.movedToHistoryAt 
                          ? formatDate(new Date(payroll.movedToHistoryAt).toISOString().split('T')[0])
                          : "-"}
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

