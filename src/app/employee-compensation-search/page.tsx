"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeeCompensationSearch from "@/pages/EmployeeCompensationSearch";

export default function EmployeeCompensationSearchPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <EmployeeCompensationSearch />
      </Layout>
    </ProtectedRoute>
  );
}
