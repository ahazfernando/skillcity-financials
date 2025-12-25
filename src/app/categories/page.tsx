"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import CategoriesPage from "@/pages/Categories";

export default function Categories() {
  return (
    <ProtectedRoute>
      <Layout>
        <CategoriesPage />
      </Layout>
    </ProtectedRoute>
  );
}

