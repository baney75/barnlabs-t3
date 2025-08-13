import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import ModelViewer from "~/components/viewer/ModelViewer";
import { api } from "~/trpc/server";
// Use a wrapper client component to avoid JSX type issues in React 19
const QRCode = dynamic(() => import("~/components/qr/QRCodeClient"), {
  ssr: false,
}) as unknown as (props: { value: string; size?: number }) => JSX.Element;

export default async function SharePage({
  params,
}: {
  params: { id: string };
}) {
  const share = await api.share.get({ id: params.id }).catch(() => null);
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
          <aside className="space-y-4 rounded-md border p-4">
            <div>
              <div className="mb-2 text-sm opacity-70">Share</div>
              <QRCode
                value={`${process.env.PUB_URL ?? "http://localhost:3000"}/s/${share.id}`}
                size={256}
              />
            </div>
            <div className="text-xs opacity-70">Created with BarnLabs</div>
          </aside>
        </div>
      </section>
    </main>
  );
}
