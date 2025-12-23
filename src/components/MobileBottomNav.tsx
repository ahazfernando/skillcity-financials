"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Menu, 
  MessageSquare, 
  User, 
  Settings,
  FileText, 
  Users, 
  Wallet, 
  Building2, 
  Calendar, 
  Bell, 
  UserCog,
  UserCircle,
  DollarSign,
  Network,
  Calculator,
  Receipt,
  BarChart3,
  History,
  Archive,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Invoice History", url: "/invoice-history", icon: Archive },
  { title: "Payroll", url: "/payroll", icon: Wallet },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Reports & Analytics", url: "/reports", icon: BarChart3 },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Employee Pay Rates", url: "/employee-pay-rates", icon: DollarSign },
  { title: "Salary Calculator", url: "/salary-calculator", icon: Calculator },
  { title: "Sites", url: "/sites", icon: Building2 },
  { title: "Site Employee Allocations", url: "/site-employee-allocations", icon: Network },
  { title: "Clients", url: "/clients", icon: UserCircle },
  { title: "Work Schedule", url: "/schedule", icon: Calendar },
  { title: "Reminders", url: "/reminders", icon: Bell },
  { title: "Activity Log", url: "/activity-log", icon: History },
  { title: "Cleaning Tracker", url: "/cleaning-tracker", icon: Sparkles },
];

const adminItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "User Management", url: "/user-management", icon: UserCog },
];

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { userData } = useAuth();
  const isAdmin = userData?.role === "admin" || userData?.isAdmin;

  if (!isMobile) {
    return null;
  }

  // Determine if user is on employee portal
  const isEmployeePortal = pathname.startsWith("/employee");
  const dashboardPath = isEmployeePortal ? "/employee" : "/";
  const profilePath = isEmployeePortal ? "/employee/profile" : "/settings";

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: dashboardPath,
      onClick: () => router.push(dashboardPath),
    },
    {
      icon: Menu,
      label: "Menu",
      path: null,
      onClick: () => setMenuOpen(true),
    },
    {
      icon: FileText,
      label: isEmployeePortal ? "Timesheet" : "Invoices",
      path: isEmployeePortal ? "/employee/timesheet" : "/invoices",
      onClick: () => router.push(isEmployeePortal ? "/employee/timesheet" : "/invoices"),
      isLarge: true,
    },
    {
      icon: MessageSquare,
      label: "Chat",
      path: "/chat",
      onClick: () => router.push("/chat"),
    },
    {
      icon: User,
      label: "Profile",
      path: profilePath,
      onClick: () => router.push(profilePath),
    },
  ];

  const isActive = (path: string | null) => {
    if (!path) return false;
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            if (item.isLarge) {
              // Large center icon
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={cn(
                    "flex h-14 w-14 -translate-y-2 flex-col items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </button>
              );
            }

            return (
              <button
                key={index}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            <div className="p-2">
              <div className="mb-4">
                <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Menu
                </h3>
                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.url || 
                      (item.url !== "/" && pathname.startsWith(item.url));
                    
                    return (
                      <NavLink
                        key={item.title}
                        to={item.url}
                        end
                        onClick={() => {
                          setMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Always show Admin section - pages handle permission checks */}
              <div>
                <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Admin
                </h3>
                <div className="space-y-1">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.url || 
                      (item.url !== "/" && pathname.startsWith(item.url));
                    
                    return (
                      <NavLink
                        key={item.title}
                        to={item.url}
                        end
                        onClick={() => {
                          setMenuOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

