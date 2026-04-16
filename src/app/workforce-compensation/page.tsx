"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeeCompensationSearch from "@/pages/EmployeeCompensationSearch";

export default function WorkforceCompensationPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <EmployeeCompensationSearch />
      </Layout>
    </ProtectedRoute>
  );
}
