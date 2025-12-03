"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Clients from "@/pages/Clients";

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Clients />
      </Layout>
    </ProtectedRoute>
  );
}




