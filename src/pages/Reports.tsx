"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, DollarSign, Calendar as CalendarIcon, Loader2, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, Sparkles, ArrowUpRight, ArrowDownRight, Activity, Target } from "lucide-react";
import { getAllInvoices } from "@/lib/firebase/invoices";
import { getAllPayrolls } from "@/lib/firebase/payroll";
import { getAllExpenses } from "@/lib/firebase/expenses";
import { Invoice, Payroll } from "@/types/financial";
import { generateMonthlyReport } from "@/lib/monthly-report-generator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
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

  // Calculate profit margin
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";
  const profitTrend = netProfit >= 0 ? "up" : "down";

  return (
    <div className="space-y-6">
      {/* Modern Hero Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/20 shadow-lg">
                  <BarChart3 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Reports & Analytics
                  </h1>
                  <p className="text-muted-foreground mt-1 text-base">Comprehensive financial insights and performance metrics</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal h-12 shadow-sm border-2 hover:border-primary/50 transition-colors">
                    <CalendarIcon className="mr-2 h-5 w-5" />
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
              <Button 
                onClick={handleGenerateReport} 
                disabled={isGenerating || !dateRange?.from} 
                className="w-full sm:w-auto h-12 shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Generate PDF Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Revenue</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20 dark:bg-green-500/30 group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{formatCurrency(totalRevenue)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span>From approved invoices</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30 dark:from-red-500/20 dark:via-red-500/10 dark:to-transparent dark:border-red-500/50">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Expenses</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/20 dark:bg-red-500/30 group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{formatCurrency(totalExpenses)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
              <span>Approved expenses</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 dark:from-orange-500/20 dark:via-orange-500/10 dark:to-transparent dark:border-orange-500/50">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Payroll Costs</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/20 dark:bg-orange-500/30 group-hover:scale-110 transition-transform">
              <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{formatCurrency(payrollExpenses)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowDownRight className="h-3 w-3 text-orange-600 dark:text-orange-400" />
              <span>Employee payroll</span>
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50' : 'from-red-500/10 via-red-500/5 to-transparent border-red-500/30 dark:from-red-500/20 dark:via-red-500/10 dark:to-transparent dark:border-red-500/50'}`}>
          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-500/20' : 'from-red-500/20'} to-transparent rounded-bl-full`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Net Profit</CardTitle>
            <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-blue-500/20 dark:bg-blue-500/30' : 'bg-red-500/20 dark:bg-red-500/30'} group-hover:scale-110 transition-transform`}>
              <Target className={`h-5 w-5 ${netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-3xl font-bold mb-1 ${netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {formatCurrency(netProfit)}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {profitTrend === "up" ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium">{profitMargin}% margin</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400 font-medium">{profitMargin}% margin</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Monthly Financial Overview</CardTitle>
                <CardDescription className="mt-1">Revenue, Expenses, and Payroll trends</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-[350px] flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-muted-foreground font-medium">Loading chart data...</span>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[350px]">
                <BarChart data={monthlyDataArray}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    className="text-xs"
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    className="text-xs"
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="payroll" fill="var(--color-payroll)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                <PieChartIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Expense Categories</CardTitle>
                <CardDescription className="mt-1">Breakdown by category</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-[350px] flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-muted-foreground font-medium">Loading chart data...</span>
              </div>
            ) : categoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[350px]">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[350px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <PieChartIcon className="h-16 w-16 opacity-20" />
                <p className="font-medium">No expense data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Profit Trend */}
      <Card className="border-2 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <LineChartIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Profit Trend Analysis</CardTitle>
              <CardDescription className="mt-1">Monthly profit/loss trajectory over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="h-[350px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="text-muted-foreground font-medium">Loading chart data...</span>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[350px]">
              <LineChart data={monthlyDataArray.map((d) => ({ ...d, profit: d.revenue - d.expenses - d.payroll }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs"
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} 
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="var(--color-revenue)" 
                  strokeWidth={3}
                  dot={{ fill: "var(--color-revenue)", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;

