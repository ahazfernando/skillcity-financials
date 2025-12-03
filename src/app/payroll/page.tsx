"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Payroll from "@/pages/Payroll";

export default function PayrollPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Payroll />
      </Layout>
    </ProtectedRoute>
  );
}

