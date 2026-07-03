"use client";

import { ReactNode } from "react";
import { AdminShell } from "@/components/dashboard/AdminShell";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return <AdminShell>{children}</AdminShell>;
}
