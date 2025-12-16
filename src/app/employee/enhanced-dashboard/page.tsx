"use client";

import { EmployeeLayout } from "@/components/EmployeeLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EnhancedEmployeeDashboard from "@/pages/EnhancedEmployeeDashboard";

export default function EnhancedDashboardPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={false}>
      <EmployeeLayout>
        <EnhancedEmployeeDashboard />
      </EmployeeLayout>
    </ProtectedRoute>
  );
}



