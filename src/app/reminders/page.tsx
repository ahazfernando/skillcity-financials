"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Reminders from "@/pages/Reminders";

export default function RemindersPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Reminders />
      </Layout>
    </ProtectedRoute>
  );
}

