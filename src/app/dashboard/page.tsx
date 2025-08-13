import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { HydrateClient, api } from "~/trpc/server";
import DashboardWrapper from "./_components/DashboardWrapper";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");
  const doc = await api.dashboard.getMine();
  return (
    <HydrateClient>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-4 [font-family:var(--font-display)] text-3xl">
          Welcome {session.user.name ?? "User"}!
        </h1>
        <DashboardWrapper initialContent={doc.content} />
      </main>
    </HydrateClient>
  );
}
