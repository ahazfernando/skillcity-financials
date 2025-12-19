"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Tasks from "@/pages/Tasks";

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Tasks />
      </Layout>
    </ProtectedRoute>
  );
}

