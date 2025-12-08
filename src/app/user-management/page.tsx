"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import UserManagement from "@/pages/UserManagement";

export default function UserManagementPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={true}>
      <Layout>
        <UserManagement />
      </Layout>
    </ProtectedRoute>
  );
}








