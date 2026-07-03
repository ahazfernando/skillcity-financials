"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-sidebar flex">
      <Sidebar collapsed={collapsed} />

      <div className="flex-1 p-3 md:p-4 min-w-0">
        <div className="flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[24px] border border-border bg-background shadow-elevated animate-fade-in dark:border-white/5">
          <TopHeader
            leading={
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-base hover:bg-muted dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:shadow-none dark:hover:bg-[#252525] lg:flex"
                aria-label="Toggle sidebar"
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            }
          />
          <div className="min-h-0 flex-1 overflow-auto p-5 pb-24 md:p-8 md:pb-8">{children}</div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
