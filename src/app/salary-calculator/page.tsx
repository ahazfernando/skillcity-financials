"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import SalaryCalculator from "@/pages/SalaryCalculator";

export default function SalaryCalculatorPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <SalaryCalculator />
      </Layout>
    </ProtectedRoute>
  );
}













