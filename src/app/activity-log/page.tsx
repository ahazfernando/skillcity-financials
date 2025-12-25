"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ActivityLogPage from "@/pages/ActivityLog";

export default function ActivityLogPageRoute() {
  return (
    <ProtectedRoute>
      <Layout>
        <ActivityLogPage />
      </Layout>
    </ProtectedRoute>
  );
}






























