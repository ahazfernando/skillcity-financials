"use client";

import { EmployeeLayout } from "@/components/EmployeeLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeeProfile from "@/pages/EmployeeProfile";

export default function EmployeeProfilePage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={false}>
      <EmployeeLayout>
        <EmployeeProfile />
      </EmployeeLayout>
    </ProtectedRoute>
  );
}





