"use client";

import dynamic from "next/dynamic";

const QRCode = dynamic(() => import("~/components/qr/QRCodeClient"), {
  ssr: false,
}) as unknown as (props: { value: string; size?: number }) => React.ReactElement;

interface SharePageClientProps {
  shareUrl: string;
}

export default function SharePageClient({ shareUrl }: SharePageClientProps) {
  return (
    <aside className="space-y-4 rounded-md border p-4">
      <div>
        <div className="mb-2 text-sm opacity-70">Share</div>
        <QRCode value={shareUrl} size={256} />
      </div>
      <div className="text-xs opacity-70">Created with BarnLabs</div>
    </aside>
  );
}
