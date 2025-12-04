"use client";

import { Layout } from "@/components/Layout";
import Dashboard from "./Dashboard";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

const Index = () => {
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
};

export default Index;
