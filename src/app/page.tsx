"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const router = useRouter();
  const { userData, loading } = useAuth();

  useEffect(() => {
    if (!loading && userData) {
      const isAdmin = userData.role === "admin" || userData.isAdmin;
      if (!isAdmin) {
        router.push("/employee");
      }
    }
  }, [userData, loading, router]);

  return (
    <ProtectedRoute requireApproval={true} requireAdmin={true}>
      <Layout>
        <Dashboard />
      </Layout>
    </ProtectedRoute>
  );
}

