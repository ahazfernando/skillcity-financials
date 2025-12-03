"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Settings from "@/pages/Settings";

export default function SettingsPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={true}>
      <Layout>
        <Settings />
      </Layout>
    </ProtectedRoute>
  );
}

