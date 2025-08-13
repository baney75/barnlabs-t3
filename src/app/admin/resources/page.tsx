import { HydrateClient } from "~/trpc/server";
import ShareCreatorClient from "~/components/share/ShareCreatorClient";

export default function ResourcesPage() {
  return (
    <HydrateClient>
      <div className="space-y-6">
        <h1 className="text-2xl [font-family:var(--font-display)]">Resource Manager</h1>
        <section className="rounded-md border p-4">
          <h2 className="mb-3 text-lg font-semibold">Create Share</h2>
          <ShareCreatorClient />
        </section>
      </div>
    </HydrateClient>
  );
}


