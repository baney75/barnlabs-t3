"use client";
import DashboardClient from "~/components/dashboard/DashboardClient";

type CardType = "markdown" | "model" | "video" | "pdf";
interface CardDef {
  id: string;
  type: CardType;
  x: number;
  y: number;
  w: number;
  h: number;
  data: Record<string, unknown>;
}
interface DashboardContent {
  cards: CardDef[];
}

interface DashboardWrapperProps {
  initialContent: DashboardContent;
}

export default function DashboardWrapper({ initialContent }: DashboardWrapperProps) {
  return <DashboardClient initialContent={initialContent} />;
}
