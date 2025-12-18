"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import InvoiceHistory from "@/pages/InvoiceHistory";

export default function InvoiceHistoryPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <InvoiceHistory />
      </Layout>
    </ProtectedRoute>
  );
}




















