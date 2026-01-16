"use client";

import { EmployeeLayout } from "@/components/EmployeeLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AuditUpload from "@/pages/AuditUpload";

export default function AuditUploadPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={false}>
      <EmployeeLayout>
        <AuditUpload />
      </EmployeeLayout>
    </ProtectedRoute>
  );
}
