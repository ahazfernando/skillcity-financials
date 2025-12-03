"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeePayRateCard from "@/pages/EmployeePayRateCard";

export default function EmployeePayRateCardPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <EmployeePayRateCard />
      </Layout>
    </ProtectedRoute>
  );
}













