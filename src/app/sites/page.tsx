"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Sites from "@/pages/Sites";

export default function SitesPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Sites />
      </Layout>
    </ProtectedRoute>
  );
}

