"use client";

import dynamic from "next/dynamic";

const DashboardClient = dynamic(
  () => import("~/components/dashboard/DashboardClient"),
  { ssr: false },
);

interface DashboardWrapperProps {
  initialContent: any;
}

export default function DashboardWrapper({ initialContent }: DashboardWrapperProps) {
  return <DashboardClient initialContent={initialContent} />;
}
