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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Financial overview and key metrics</p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="relative overflow-hidden bg-card border shadow-lg p-0 rounded-[32px]">
                <CardHeader className="relative px-6 pt-6">
                  <Skeleton className="h-16 w-16 rounded-lg mb-4" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-8 w-40" />
                </CardHeader>
                <CardContent className="bg-muted/30 dark:bg-muted/20 rounded-b-[32px] px-6 py-4 border-t">
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="relative overflow-hidden bg-card border shadow-lg p-0 rounded-[32px]">
              <CardHeader className="relative px-6 pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-green-500/10 dark:bg-green-500/20">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-sm font-medium mt-4 text-muted-foreground">Total Revenue</CardTitle>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {formatCurrency(totalRevenue)}
                </div>
              </CardHeader>
              <CardContent className="bg-muted/30 dark:bg-muted/20 rounded-b-[32px] px-6 py-4 border-t">
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(pendingRevenue)} pending
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-card border shadow-lg p-0 rounded-[32px]">
              <CardHeader className="relative px-6 pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-red-500/10 dark:bg-red-500/20">
                    <Wallet className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <CardTitle className="text-sm font-medium mt-4 text-muted-foreground">Total Expenses</CardTitle>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {formatCurrency(totalExpenses)}
                </div>
              </CardHeader>
              <CardContent className="bg-muted/30 dark:bg-muted/20 rounded-b-[32px] px-6 py-4 border-t">
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(pendingExpenses)} pending
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-card border shadow-lg p-0 rounded-[32px]">
              <CardHeader className="relative px-6 pt-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${profit >= 0 ? 'bg-green-500/10 dark:bg-green-500/20' : 'bg-red-500/10 dark:bg-red-500/20'}`}>
                    <TrendingUp className={`h-6 w-6 ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                </div>
                <CardTitle className="text-sm font-medium mt-4 text-muted-foreground">Net Profit</CardTitle>
                <div className={`text-3xl font-bold mt-2 ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(profit)}
                </div>
              </CardHeader>
              <CardContent className="bg-muted/30 dark:bg-muted/20 rounded-b-[32px] px-6 py-4 border-t">
                <p className="text-xs text-muted-foreground">Cash flow method</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-card border shadow-lg p-0 rounded-[32px]">
              <CardHeader className="relative px-6 pt-6">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-sm font-medium mt-4 text-muted-foreground">Pending Items</CardTitle>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {invoices.filter(i => i.status === "pending").length + 
                   payrolls.filter(p => p.status === "pending").length}
                </div>
              </CardHeader>
              <CardContent className="bg-muted/30 dark:bg-muted/20 rounded-b-[32px] px-6 py-4 border-t">
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="shadow-card border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Monthly Cash Flow</CardTitle>
            <CardDescription>Revenue vs Expenses (Cash Flow Method)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4 h-[300px]">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : (
            <ChartContainer config={cashFlowConfig}>
                <BarChart accessibilityLayer data={monthlyDataArray.length > 0 ? monthlyDataArray : [{ month: "No Data", revenue: 0, expenses: 0 }]}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      hideLabel 
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  } 
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="revenue"
                  stackId="a"
                  fill="var(--color-revenue)"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="expenses"
                  stackId="a"
                  fill="var(--color-expenses)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium">
              Net Profit: {formatCurrency(profit)} <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground leading-none">
              Based on received payments
            </div>
          </CardFooter>
        </Card>

        <Card className="flex flex-col shadow-card border">
          <CardHeader className="items-center pb-4">
            <CardTitle className="text-lg font-semibold">Invoice Status Distribution</CardTitle>
            <CardDescription>Current status of all invoices</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
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
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie data={statusData} dataKey="count" nameKey="status" />
              </PieChart>
            </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="text-muted-foreground leading-none">
              Total {invoices.length} invoices tracked
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
