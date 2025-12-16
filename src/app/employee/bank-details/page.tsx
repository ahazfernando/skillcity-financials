"use client";

import { EmployeeLayout } from "@/components/EmployeeLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeeBankDetails from "@/pages/EmployeeBankDetails";

export default function EmployeeBankDetailsPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={false}>
      <EmployeeLayout>
        <EmployeeBankDetails />
      </EmployeeLayout>
    </ProtectedRoute>
  );
}


