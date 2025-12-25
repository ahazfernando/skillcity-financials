"use client";

import { EmployeeLayout } from "@/components/EmployeeLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeeTimesheet from "@/pages/EmployeeTimesheet";

export default function EmployeeTimesheetPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={false}>
      <EmployeeLayout>
        <EmployeeTimesheet />
      </EmployeeLayout>
    </ProtectedRoute>
  );
}

















