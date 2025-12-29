"use client";

import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Wallet, 
  Building2, 
  Calendar, 
  Bell, 
  Settings, 
  UserCog,
  UserCircle,
  DollarSign,
  Network,
  Calculator,
  Receipt,
  BarChart3,
  History,
  MessageSquare,
  Clock,
  CheckSquare,
  Sparkles,
  Package,
  FolderTree,
  MapPin
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Payroll", url: "/payroll", icon: Wallet },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Reports & Analytics", url: "/reports", icon: BarChart3 },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Employee Pay Rates", url: "/employee-pay-rates", icon: DollarSign },
  { title: "Employee Locations", url: "/employee-locations", icon: MapPin },
  { title: "Sites", url: "/sites", icon: Building2 },
  { title: "Site Employee Allocations", url: "/site-employee-allocations", icon: Network },
  { title: "Clients", url: "/clients", icon: UserCircle },
  { title: "Work Schedule", url: "/schedule", icon: Calendar },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Reminders", url: "/reminders", icon: Bell },
  { title: "Activity Log", url: "/activity-log", icon: History },
  { title: "Employee Timesheets", url: "/employee-timesheets", icon: Clock },
  { title: "Cleaning Tracker", url: "/cleaning-tracker", icon: Sparkles },
  { title: "Products", url: "/products", icon: Package },
  { title: "Categories", url: "/categories", icon: FolderTree },
];

const adminItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "User Management", url: "/user-management", icon: UserCog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { userData, loading } = useAuth();
  const isCollapsed = state === "collapsed";
  const isAdmin = userData?.role === "admin" || userData?.isAdmin;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Always show Admin section - pages handle permission checks */}
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
