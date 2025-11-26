"use client";

import { Layout } from "@/components/Layout";
import dynamic from "next/dynamic";

const Payroll = dynamic(() => import("@/pages/Payroll"), {
  ssr: false,
});

export default function PayrollPage() {
  return (
    <Layout>
      <Payroll />
    </Layout>
  );
}

