"use client";

import { EmployeeLayout } from "@/components/EmployeeLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeeLocation from "@/pages/EmployeeLocation";

export default function EmployeeLocationPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={false}>
      <EmployeeLayout>
        <EmployeeLocation />
      </EmployeeLayout>
    </ProtectedRoute>
  );
}
