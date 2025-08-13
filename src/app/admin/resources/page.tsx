import { HydrateClient } from "~/trpc/server";
import ShareCreatorClient from "~/components/share/ShareCreatorClient";
import UploadPanel from "~/components/admin/UploadPanel";

export default function ResourcesPage() {
  return (
    <HydrateClient>
      <div className="space-y-6">
        <h1 className="[font-family:var(--font-display)] text-2xl">
          Resource Manager
        </h1>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-md border p-4">
            <h2 className="mb-3 text-lg font-semibold">Create Share</h2>
            <ShareCreatorClient />
          </section>
          <section className="rounded-md border p-4">
            <h2 className="mb-3 text-lg font-semibold">Upload Assets</h2>
            <p className="mb-2 opacity-80">Upload GLB/USDZ via UploadThing.</p>
            <UploadPanel />
          </section>
        </div>
      </div>
    </HydrateClient>
  );
}
