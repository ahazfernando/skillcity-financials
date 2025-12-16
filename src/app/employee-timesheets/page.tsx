"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeeTimesheetsAdmin from "@/pages/EmployeeTimesheetsAdmin";

export default function EmployeeTimesheetsPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={true}>
      <Layout>
        <EmployeeTimesheetsAdmin />
      </Layout>
    </ProtectedRoute>
  );
}

