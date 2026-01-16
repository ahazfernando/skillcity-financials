"use client";

import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AuditReview from "@/pages/AuditReview";

export default function AuditReviewPage() {
  return (
    <ProtectedRoute requireApproval={true} requireAdmin={true}>
      <Layout>
        <AuditReview />
      </Layout>
    </ProtectedRoute>
  );
}
