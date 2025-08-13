"use client";
import { useCallback, useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "~/server/uploadthing/core";
import { Button } from "~/components/ui/button";
import { useEffect } from "react";

export default function UploadPanel({
  onComplete,
}: {
  onComplete?: (file: { key: string; url: string; type?: string }) => void;
}) {
  const [last, setLast] = useState<{
    key: string;
    url: string;
    type?: string;
  } | null>(null);
  const handleComplete = useCallback(
    (res: Array<{ key: string; url: string; type?: string }>) => {
      if (res?.[0]) {
        setLast(res[0]);
        onComplete?.(res[0]);
      }
    },
    [onComplete],
  );

  return (
    <div className="space-y-3">
      <UploadButton<OurFileRouter, "modelFiles">
        endpoint="modelFiles"
        onClientUploadComplete={handleComplete}
        appearance={{
          button: "bg-[color:var(--color-contact-button-bg)] text-black",
        }}
      />
      {last && (
        <div className="text-sm opacity-80">
          Uploaded:{" "}
          <a
            className="underline"
            href={last.url}
            target="_blank"
            rel="noreferrer"
          >
            {last.key}
          </a>
        </div>
      )}
      {last?.type === "model/gltf-binary" && (
        <div className="rounded-md border p-3 text-sm">
          For iOS AR, upload a matching USDZ and link it to the model.
        </div>
      )}
      <Button asChild variant="secondary">
        <a href="/admin/resources">Go to Resource Manager</a>
      </Button>
    </div>
  );
}
