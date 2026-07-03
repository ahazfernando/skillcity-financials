"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Receipt,
  BarChart3,
  Users,
  Building2,
  Network,
  UserCircle,
  CheckSquare,
  Sparkles,
  ClipboardCheck,
  History,
  Package,
  FolderTree,
  Settings,
  UserCog,
  Search,
  ArrowRight,
} from "lucide-react";

const mainMenu = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Invoices", icon: FileText, href: "/invoices" },
  { label: "Payroll", icon: Wallet, href: "/payroll" },
  { label: "Workforce Compensation", icon: Wallet, href: "/workforce-compensation" },
  { label: "Expenses", icon: Receipt, href: "/expenses" },
  { label: "Reports & Analytics", icon: BarChart3, href: "/reports" },
  { label: "Employees", icon: Users, href: "/employees" },
  { label: "Sites", icon: Building2, href: "/sites" },
  { label: "Site Allocations", icon: Network, href: "/site-employee-allocations" },
  { label: "Clients", icon: UserCircle, href: "/clients" },
  { label: "Tasks", icon: CheckSquare, href: "/tasks" },
  { label: "Cleaning Tracker", icon: Sparkles, href: "/cleaning-tracker" },
  { label: "Audit Review", icon: ClipboardCheck, href: "/audit-review" },
  { label: "Activity Log", icon: History, href: "/activity-log" },
  { label: "Vehicles", icon: Package, href: "/vehicles" },
  { label: "Categories", icon: FolderTree, href: "/categories" },
  { label: "Quote Templates", icon: FileText, href: "/quote-template" },
];

const adminMenu = [
  { label: "Settings", icon: Settings, href: "/settings" },
  { label: "User Management", icon: UserCog, href: "/user-management" },
];

const menu = [...mainMenu, ...adminMenu];

const isActiveRoute = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const Sidebar = ({ collapsed = false }: { collapsed?: boolean }) => {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "/";

  if (collapsed) {
    return (
      <aside className="hidden lg:flex w-[72px] shrink-0 bg-sidebar text-sidebar-foreground flex-col items-center p-4 gap-4 sticky top-0 h-screen">
        <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground text-sm">
          SC
        </div>
        <nav className="flex-1 flex flex-col gap-1 mt-2 overflow-y-auto scrollbar-hide">
          {menu.map((item) => {
            const isActive = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 bg-sidebar text-sidebar-foreground flex-col p-5 gap-6 sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-2">
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground text-sm">
          SC
        </div>
        <div>
          <div className="text-lg font-bold leading-none text-sidebar-foreground">Skill City</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 mt-1">
            Financial Management
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
        <input
          placeholder="Search here..."
          className="w-full bg-sidebar-accent text-sm rounded-xl pl-9 pr-12 py-2.5 outline-none placeholder:text-sidebar-foreground/40 focus:ring-2 focus:ring-sidebar-primary/40"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-sidebar-border px-1.5 py-0.5 rounded text-sidebar-foreground/60">
          ⌘K
        </kbd>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="text-[10px] font-semibold tracking-[0.15em] text-sidebar-foreground/40 px-3 mb-2">
          MAIN MENU
        </div>
        <ul className="space-y-1">
          {mainMenu.map((item) => (
            <MenuItem key={item.label} {...item} pathname={pathname} />
          ))}
        </ul>

        <div className="text-[10px] font-semibold tracking-[0.15em] text-sidebar-foreground/40 px-3 mb-2 mt-5">
          ADMIN
        </div>
        <ul className="space-y-1">
          {adminMenu.map((item) => (
            <MenuItem key={item.label} {...item} pathname={pathname} />
          ))}
        </ul>
      </nav>

      <div className="rounded-2xl p-4 bg-gradient-sidebar-card text-white relative overflow-hidden shadow-glow">
        <div className="text-[10px] uppercase tracking-wider opacity-80">Financial Hub</div>
        <div className="font-bold text-base mt-1">Skill City Central</div>
        <div className="text-xs opacity-80 mt-0.5">Invoices · Payroll · Reports</div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px] bg-white/20 backdrop-blur px-2 py-0.5 rounded-full">Live</span>
          <span className="text-[10px] bg-white/20 backdrop-blur px-2 py-0.5 rounded-full">AU</span>
        </div>
        <Link
          href="/reports"
          className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-white text-[#007300] flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="View reports"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
};

const MenuItem = ({
  label,
  icon: Icon,
  href,
  pathname,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  pathname: string;
}) => {
  const isActive = isActiveRoute(pathname, href);

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-glow"
            : "hover:bg-sidebar-accent text-sidebar-foreground"
        }`}
      >
        <Icon className="w-[18px] h-[18px]" />
        <span className="flex-1">{label}</span>
      </Link>
    </li>
  );
};
