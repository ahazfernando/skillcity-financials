"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import SiteEmployeeAllocations from "@/pages/SiteEmployeeAllocations";

export default function SiteEmployeeAllocationsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <SiteEmployeeAllocations />
      </Layout>
    </ProtectedRoute>
  );
}












