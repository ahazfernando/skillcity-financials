"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, DollarSign, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { getAllInvoices } from "@/lib/firebase/invoices";
import { getAllPayrolls } from "@/lib/firebase/payroll";
import { getAllExpenses } from "@/lib/firebase/expenses";
import { Invoice, Payroll } from "@/types/financial";
import { generateMonthlyReport } from "@/lib/monthly-report-generator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Line, LineChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

const Reports = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportType, setReportType] = useState<string>("financial");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedInvoices, fetchedPayrolls, fetchedExpenses] = await Promise.all([
          getAllInvoices(),
          getAllPayrolls(),
          getAllExpenses(),
        ]);
        setInvoices(fetchedInvoices);
        setPayrolls(fetchedPayrolls);
        setExpenses(fetchedExpenses);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleGenerateReport = async () => {
    if (!dateRange?.from) {
      return;
    }

    try {
      setIsGenerating(true);
      const month = dateRange.from ? format(dateRange.from, "yyyy-MM") : new Date().toISOString().slice(0, 7);
      const filteredPayrolls = payrolls.filter((p) => {
        const payrollDate = p.date.split(".").reverse().join("-");
        return payrollDate.startsWith(month);
      });
      await generateMonthlyReport(filteredPayrolls, month);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate financial metrics
  const totalRevenue = invoices
    .filter((inv) => inv.status === "received")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalExpenses = expenses
    .filter((exp) => exp.status === "approved")
    .reduce((sum, exp) => sum + exp.amount, 0);

  const payrollExpenses = payrolls
    .filter((p) => p.modeOfCashFlow === "outflow" && p.status === "received")
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const totalExpenditure = totalExpenses + payrollExpenses;
  const netProfit = totalRevenue - totalExpenditure;

  // Monthly data for charts
  const monthlyData = invoices.reduce((acc, inv) => {
    const month = new Date(inv.issueDate).toLocaleString("default", { month: "short", year: "numeric" });
    if (!acc[month]) {
      acc[month] = { month, revenue: 0, expenses: 0, payroll: 0 };
    }
    if (inv.status === "received") {
      acc[month].revenue += inv.totalAmount;
    }
    return acc;
  }, {} as Record<string, { month: string; revenue: number; expenses: number; payroll: number }>);

  expenses.forEach((exp) => {
    if (exp.status === "approved" && exp.date) {
      // Handle DD.MM.YYYY format or ISO format
      let dateStr = exp.date;
      if (dateStr.includes(".")) {
        const parts = dateStr.split(".");
        if (parts.length === 3) {
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      try {
        const month = new Date(dateStr).toLocaleString("default", { month: "short", year: "numeric" });
        if (!monthlyData[month]) {
          monthlyData[month] = { month, revenue: 0, expenses: 0, payroll: 0 };
        }
        monthlyData[month].expenses += exp.amount;
      } catch (e) {
        // Skip invalid dates
      }
    }
  });

  payrolls.forEach((pay) => {
    if (pay.modeOfCashFlow === "outflow" && pay.status === "received" && pay.date) {
      const month = new Date(pay.date.split(".").reverse().join("-")).toLocaleString("default", { month: "short", year: "numeric" });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, expenses: 0, payroll: 0 };
      }
      monthlyData[month].payroll += pay.totalAmount;
    }
  });

  const monthlyDataArray = Object.values(monthlyData).slice(-6);

  // Category breakdown for expenses
  const expenseCategories = expenses
    .filter((exp) => exp.status === "approved")
    .reduce((acc, exp) => {
      const category = exp.category || "other";
      acc[category] = (acc[category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

  const categoryData = Object.entries(expenseCategories).map(([name, value]) => ({
    name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value,
  }));

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
    expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
    payroll: { label: "Payroll", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Comprehensive financial reports and analytics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
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
          <Button onClick={handleGenerateReport} disabled={isGenerating || !dateRange?.from} className="w-full sm:w-auto">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate PDF Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From approved invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Approved expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Costs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payrollExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Employee payroll</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
              ${netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Revenue - Total Costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Financial Overview</CardTitle>
            <CardDescription>Revenue, Expenses, and Payroll trends</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ChartContainer config={chartConfig}>
                <BarChart data={monthlyDataArray}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" />
                  <Bar dataKey="payroll" fill="var(--color-payroll)" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : categoryData.length > 0 ? (
              <ChartContainer config={chartConfig}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profit Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Trend</CardTitle>
          <CardDescription>Monthly profit/loss over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ChartContainer config={chartConfig}>
              <LineChart data={monthlyDataArray.map((d) => ({ ...d, profit: d.revenue - d.expenses - d.payroll }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="profit" stroke="var(--color-revenue)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;

