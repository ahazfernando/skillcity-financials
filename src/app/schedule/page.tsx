"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Schedule from "@/pages/Schedule";

export default function SchedulePage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Schedule />
      </Layout>
    </ProtectedRoute>
  );
}

