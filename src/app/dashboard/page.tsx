import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { HydrateClient, api } from "~/trpc/server";
import DashboardWrapper from "./_components/DashboardWrapper";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");
  const doc = await api.dashboard.getMine();
  type CardType = "markdown" | "model" | "video" | "pdf";
  type DashboardContent = {
    cards: Array<{
      id: string;
      type: CardType;
      x: number;
      y: number;
      w: number;
      h: number;
      data: Record<string, unknown>;
    }>;
  };
  function coerceContent(value: unknown): DashboardContent {
    const v = value as { cards?: unknown } | null | undefined;
    if (!v || !Array.isArray(v.cards)) return { cards: [] };
    // Minimal shape validation
    const cards = v.cards
      .filter((c: any) => c && typeof c.id === "string")
      .map((c: any) => ({
        id: String(c.id),
        type: (c.type as CardType) ?? "markdown",
        x: Number(c.x ?? 0),
        y: Number(c.y ?? 0),
        w: Number(c.w ?? 4),
        h: Number(c.h ?? 3),
        data: (c.data as Record<string, unknown>) ?? {},
      }));
    return { cards };
  }
  const initialContent = coerceContent(doc.content as unknown);
  return (
    <HydrateClient>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-4 [font-family:var(--font-display)] text-3xl">
          Welcome {session.user.name ?? "User"}!
        </h1>
        <DashboardWrapper initialContent={initialContent} />
      </main>
    </HydrateClient>
  );
}
