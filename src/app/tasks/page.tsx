"use client";

import { Layout } from "@/components/Layout";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Tasks from "@/pages/Tasks";
import { useAuth } from "@/contexts/AuthContext";

export default function TasksPage() {
  const { userData, loading } = useAuth();
  const isAdmin = userData?.role === "admin" || userData?.isAdmin;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {isAdmin ? (
        <Layout>
          <Tasks />
        </Layout>
      ) : (
        <EmployeeLayout>
          <Tasks />
        </EmployeeLayout>
      )}
    </ProtectedRoute>
  );
}


