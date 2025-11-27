"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Wallet, DollarSign, TrendingUp, Loader2 } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Financial overview and key metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${pendingRevenue.toLocaleString()} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${pendingExpenses.toLocaleString()} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${profit.toLocaleString()}</div>
            <p className="text-xs text-success">Cash flow method</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(i => i.status === "pending").length + 
               payrolls.filter(p => p.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cash Flow</CardTitle>
            <CardDescription>Revenue vs Expenses (Cash Flow Method)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading chart data...</span>
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
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
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
              Net Profit: ${profit.toLocaleString()} <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground leading-none">
              Based on received payments
            </div>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Invoice Status Distribution</CardTitle>
            <CardDescription>Current status of all invoices</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading chart data...</span>
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
