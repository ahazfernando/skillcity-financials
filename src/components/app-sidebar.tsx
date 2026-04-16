"use client";

import * as React from "react";
import {
  Building2,
  CheckSquare,
  ClipboardCheck,
  FileText,
  FolderTree,
  History,
  LayoutDashboard,
  Network,
  Package,
  Receipt,
  Settings,
  Sparkles,
  UserCircle,
  UserCog,
  Users,
  Wallet,
  BarChart3,
} from "lucide-react";

import { NavMain, type NavItem } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: <LayoutDashboard />,
    items: [{ title: "Overview", url: "/" }],
  },
  { title: "Invoices", url: "/invoices", icon: <FileText /> },
  { title: "Payroll", url: "/payroll", icon: <Wallet /> },
  { title: "Workforce Compensation", url: "/workforce-compensation", icon: <Wallet /> },
  { title: "Expenses", url: "/expenses", icon: <Receipt /> },
  { title: "Reports & Analytics", url: "/reports", icon: <BarChart3 /> },
  {
    title: "Employees",
    url: "/employees",
    icon: <Users />,
    items: [
      { title: "All Employees", url: "/employees" },
      { title: "Employee Pay Rates", url: "/employee-pay-rates" },
      { title: "Employee Locations", url: "/employee-locations" },
      { title: "Employee Timesheets", url: "/employee-timesheets" },
    ],
  },
  { title: "Sites", url: "/sites", icon: <Building2 /> },
  { title: "Site Employee Allocations", url: "/site-employee-allocations", icon: <Network /> },
  { title: "Clients", url: "/clients", icon: <UserCircle /> },
  { title: "Tasks", url: "/tasks", icon: <CheckSquare /> },
  { title: "Cleaning Tracker", url: "/cleaning-tracker", icon: <Sparkles /> },
  { title: "Audit Review", url: "/audit-review", icon: <ClipboardCheck /> },
  { title: "Activity Log", url: "/activity-log", icon: <History /> },
  { title: "Equipments", url: "/products", icon: <Package /> },
  { title: "Categories", url: "/categories", icon: <FolderTree /> },
];

const adminNavItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: <Settings /> },
  { title: "User Management", url: "/user-management", icon: <UserCog /> },
];

function SidebarFooterUser() {
  return <div className="px-2 py-1 text-xs text-muted-foreground">Signed in user</div>;
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const brandLabel = state === "collapsed" ? "SC" : "Skill City";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold">{brandLabel}</div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain label="Menu" items={mainNavItems} />
        <NavMain label="Admin" items={adminNavItems} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarFooterUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
