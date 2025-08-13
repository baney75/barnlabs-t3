import { notFound } from "next/navigation";
import ModelViewer from "~/components/viewer/ModelViewer";
import { api } from "~/trpc/server";
import SharePageClient from "./_components/SharePageClient";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const share = await api.share.get({ id: resolvedParams.id }).catch(() => null);
  if (!share) return notFound();
  const modelUrl = share.model?.glbStorageId
    ? `/api/models/${share.model.glbStorageId}`
    : (share.modelUrl ?? "/Earth_Model.glb");
  const usdzUrl = share.model?.usdzStorageId
    ? `/api/models/${share.model.usdzStorageId}`
    : "/Earth_Model.usdz";

  return (
    <main className="bg-background text-foreground min-h-screen">
      <section className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 [font-family:var(--font-display)] text-3xl">
          {share.title}
        </h1>
        {share.description && (
          <p className="mb-6 opacity-80">{share.description}</p>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
          <ModelViewer src={modelUrl} usdz={usdzUrl} title={share.title} />
          <SharePageClient 
            shareUrl={`${process.env.PUB_URL ?? "http://localhost:3000"}/s/${resolvedParams.id}`}
          />
        </div>
      </section>
    </main>
  );
}
