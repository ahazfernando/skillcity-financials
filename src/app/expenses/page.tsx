"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Expenses from "@/pages/Expenses";

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Expenses />
      </Layout>
    </ProtectedRoute>
  );
}



















