"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import EmployeeLocations from "@/pages/EmployeeLocations";

export default function EmployeeLocationsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <EmployeeLocations />
      </Layout>
    </ProtectedRoute>
  );
}
