"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Wallet, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getAllInvoices } from "@/lib/firebase/invoices";
import { getAllPayrolls } from "@/lib/firebase/payroll";
import { Invoice, Payroll } from "@/types/financial";
import { formatCurrency } from "@/lib/utils";

const Dashboard = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedInvoices, fetchedPayrolls] = await Promise.all([
          getAllInvoices(),
          getAllPayrolls(),
        ]);
        setInvoices(fetchedInvoices);
        setPayrolls(fetchedPayrolls);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate revenue from invoices (inflow)
  const totalRevenue = invoices
    .filter(inv => inv.status === "received")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const pendingRevenue = invoices
    .filter(inv => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Calculate expenses from payroll (outflow)
  const totalExpenses = payrolls
    .filter(pay => pay.modeOfCashFlow === "outflow" && pay.status === "received")
    .reduce((sum, pay) => sum + pay.totalAmount, 0);

  const pendingExpenses = payrolls
    .filter(pay => pay.modeOfCashFlow === "outflow" && pay.status === "pending")
    .reduce((sum, pay) => sum + pay.totalAmount, 0);

  const profit = totalRevenue - totalExpenses;

  // Group by month for chart
  const monthlyData = invoices.reduce((acc, inv) => {
    const month = new Date(inv.issueDate).toLocaleString('default', { month: 'short' });
    if (!acc[month]) {
      acc[month] = { month, revenue: 0, expenses: 0 };
    }
    if (inv.status === "received") {
      acc[month].revenue += inv.totalAmount;
    }
    return acc;
  }, {} as Record<string, { month: string; revenue: number; expenses: number }>);

  payrolls.forEach(pay => {
    if (pay.modeOfCashFlow === "outflow" && pay.status === "received") {
      const month = new Date(pay.date.split('.').reverse().join('-')).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, expenses: 0 };
      }
      monthlyData[month].expenses += pay.totalAmount;
    }
  });

  const monthlyDataArray = Object.values(monthlyData).slice(0, 6); // Last 6 months

  const statusData = [
    { status: "received", count: invoices.filter(i => i.status === "received").length, fill: "var(--color-received)" },
    { status: "pending", count: invoices.filter(i => i.status === "pending").length, fill: "var(--color-pending)" },
    { status: "overdue", count: invoices.filter(i => i.status === "overdue").length, fill: "var(--color-overdue)" },
  ];

  const cashFlowConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-1))",
    },
    expenses: {
      label: "Expenses",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  const statusConfig = {
    count: {
      label: "Invoices",
    },
    received: {
      label: "Received",
      color: "hsl(var(--chart-1))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--chart-2))",
    },
    overdue: {
      label: "Overdue",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-background border border-slate-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dashboard
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Financial overview and key metrics at a glance</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/20 border-2 border-slate-200 dark:border-slate-900/50 shadow-xl p-0 rounded-2xl">
                <CardHeader className="relative px-6 pt-6">
                  <Skeleton className="h-16 w-16 rounded-xl mb-4" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-8 w-40" />
                </CardHeader>
                <CardContent className="bg-slate-50/50 dark:bg-slate-950/20 rounded-b-2xl px-6 py-4 border-t border-slate-200 dark:border-slate-900/50">
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-200 dark:border-green-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-green-400/30 transition-colors"></div>
              <CardHeader className="relative px-6 pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Revenue</CardTitle>
                <div className="text-3xl font-bold text-green-700 dark:text-green-400 mt-2">
                  {formatCurrency(totalRevenue)}
                </div>
              </CardHeader>
              <CardContent className="bg-green-50/50 dark:bg-green-950/20 rounded-b-2xl px-6 py-4 border-t border-green-200 dark:border-green-900/50">
                <p className="text-xs text-muted-foreground font-medium">
                  {formatCurrency(pendingRevenue)} pending
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-2 border-red-200 dark:border-red-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-red-400/30 transition-colors"></div>
              <CardHeader className="relative px-6 pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Expenses</CardTitle>
                <div className="text-3xl font-bold text-red-700 dark:text-red-400 mt-2">
                  {formatCurrency(totalExpenses)}
                </div>
              </CardHeader>
              <CardContent className="bg-red-50/50 dark:bg-red-950/20 rounded-b-2xl px-6 py-4 border-t border-red-200 dark:border-red-900/50">
                <p className="text-xs text-muted-foreground font-medium">
                  {formatCurrency(pendingExpenses)} pending
                </p>
              </CardContent>
            </Card>

            <Card className={`relative overflow-hidden bg-gradient-to-br ${profit >= 0 ? 'from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-900/50' : 'from-red-50 to-rose-100/50 dark:from-red-950/30 dark:to-rose-900/20 border-2 border-red-200 dark:border-red-900/50'} shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${profit >= 0 ? 'bg-green-400/20 group-hover:bg-green-400/30' : 'bg-red-400/20 group-hover:bg-red-400/30'} rounded-full -mr-16 -mt-16 transition-colors`}></div>
              <CardHeader className="relative px-6 pt-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${profit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} shadow-lg`}>
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Net Profit</CardTitle>
                <div className={`text-3xl font-bold mt-2 ${profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {formatCurrency(profit)}
                </div>
              </CardHeader>
              <CardContent className={`${profit >= 0 ? 'bg-green-50/50 dark:bg-green-950/20 border-t border-green-200 dark:border-green-900/50' : 'bg-red-50/50 dark:bg-red-950/20 border-t border-red-200 dark:border-red-900/50'} rounded-b-2xl px-6 py-4`}>
                <p className="text-xs text-muted-foreground font-medium">Cash flow method</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-blue-400/30 transition-colors"></div>
              <CardHeader className="relative px-6 pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Pending Items</CardTitle>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-2">
                  {invoices.filter(i => i.status === "pending").length + 
                   payrolls.filter(p => p.status === "pending").length}
                </div>
              </CardHeader>
              <CardContent className="bg-blue-50/50 dark:bg-blue-950/20 rounded-b-2xl px-6 py-4 border-t border-blue-200 dark:border-blue-900/50">
                <p className="text-xs text-muted-foreground font-medium">Requires attention</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="border-2 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-500/10 via-gray-500/5 to-muted/30 border-b-2 pb-4">
            <CardTitle className="text-xl font-bold">Monthly Cash Flow</CardTitle>
            <CardDescription className="text-sm">Revenue vs Expenses (Cash Flow Method)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4 h-[300px]">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-[250px] w-full rounded-lg" />
              </div>
            ) : (
            <ChartContainer config={cashFlowConfig}>
                <BarChart accessibilityLayer data={monthlyDataArray.length > 0 ? monthlyDataArray : [{ month: "No Data", revenue: 0, expenses: 0 }]}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  className="text-xs"
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      hideLabel 
                      formatter={(value) => formatCurrency(Number(value))}
                      className="rounded-lg border shadow-lg"
                    />
                  } 
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="revenue"
                  stackId="a"
                  fill="var(--color-revenue)"
                  radius={[0, 0, 8, 8]}
                  className="hover:opacity-80 transition-opacity"
                />
                <Bar
                  dataKey="expenses"
                  stackId="a"
                  fill="var(--color-expenses)"
                  radius={[8, 8, 0, 0]}
                  className="hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="bg-muted/30 dark:bg-muted/20 flex-col items-start gap-2 text-sm border-t">
            <div className="flex gap-2 leading-none font-bold">
              Net Profit: <span className={profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {formatCurrency(profit)}
              </span>
              {profit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400 rotate-180" />
              )}
            </div>
            <div className="text-muted-foreground leading-none text-xs">
              Based on received payments
            </div>
          </CardFooter>
        </Card>

        <Card className="flex flex-col border-2 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-500/10 via-gray-500/5 to-muted/30 border-b-2 items-center pb-4">
            <CardTitle className="text-xl font-bold">Invoice Status Distribution</CardTitle>
            <CardDescription className="text-sm">Current status of all invoices</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0 pt-6">
            {isLoading ? (
              <div className="space-y-4 h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-[250px] rounded-full" />
              </div>
            ) : (
            <ChartContainer
              config={statusConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel className="rounded-lg border shadow-lg" />}
                />
                <Pie 
                  data={statusData} 
                  dataKey="count" 
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  paddingAngle={2}
                  className="hover:opacity-80 transition-opacity"
                />
              </PieChart>
            </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="bg-muted/30 dark:bg-muted/20 flex-col gap-2 text-sm border-t">
            <div className="text-muted-foreground leading-none text-xs font-medium">
              Total <span className="font-bold text-foreground">{invoices.length}</span> invoices tracked
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
