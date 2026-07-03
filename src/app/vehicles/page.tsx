"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ProductsPage from "@/pages/Products";

export default function Vehicles() {
  return (
    <ProtectedRoute>
      <Layout>
        <ProductsPage />
      </Layout>
    </ProtectedRoute>
  );
}
