"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Employees from "@/pages/Employees";

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Employees />
      </Layout>
    </ProtectedRoute>
  );
}

