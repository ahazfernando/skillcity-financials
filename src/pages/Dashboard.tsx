"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Wallet, DollarSign, TrendingUp } from "lucide-react";
import { mockInvoices, mockPayrolls, mockReminders } from "@/data/mockData";
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

const Dashboard = () => {
  const totalRevenue = mockInvoices
    .filter(inv => inv.status === "received")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const pendingRevenue = mockInvoices
    .filter(inv => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalExpenses = mockPayrolls
    .filter(pay => pay.status === "received")
    .reduce((sum, pay) => sum + pay.totalAmount, 0);

  const pendingExpenses = mockPayrolls
    .filter(pay => pay.status === "pending")
    .reduce((sum, pay) => sum + pay.totalAmount, 0);

  const profit = totalRevenue - totalExpenses;

  const monthlyData = [
    { month: "Jan", revenue: totalRevenue, expenses: totalExpenses }
  ];

  const statusData = [
    { status: "received", count: mockInvoices.filter(i => i.status === "received").length, fill: "var(--color-received)" },
    { status: "pending", count: mockInvoices.filter(i => i.status === "pending").length, fill: "var(--color-pending)" },
    { status: "overdue", count: mockInvoices.filter(i => i.status === "overdue").length, fill: "var(--color-overdue)" },
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

  const pendingReminders = mockReminders.filter(r => r.status === "pending");

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
              {mockInvoices.filter(i => i.status === "pending").length + 
               mockPayrolls.filter(p => p.status === "pending").length}
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
            <ChartContainer config={cashFlowConfig}>
              <BarChart accessibilityLayer data={monthlyData}>
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
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="text-muted-foreground leading-none">
              Total {mockInvoices.length} invoices tracked
            </div>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Reminders</CardTitle>
          <CardDescription>Pending notifications and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{reminder.title}</h4>
                    <Badge variant={
                      reminder.priority === "high" ? "destructive" : 
                      reminder.priority === "medium" ? "default" : "secondary"
                    }>
                      {reminder.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Due: {new Date(reminder.dueDate).toLocaleDateString()}
                </div>
              </div>
            ))}
            {pendingReminders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No pending reminders</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
