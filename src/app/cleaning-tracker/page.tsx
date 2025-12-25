"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import CleaningTracker from "@/pages/CleaningTracker";

export default function CleaningTrackerPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <CleaningTracker />
      </Layout>
    </ProtectedRoute>
  );
}





