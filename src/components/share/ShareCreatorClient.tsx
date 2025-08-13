"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

const QRCode = dynamic(() => import("qrcode.react").then(m => m.QRCodeSVG), { ssr: false });

type Mode = "existing" | "url";

export default function ShareCreatorClient() {
  const { data: models } = api.model.listMine.useQuery();
  const create = api.share.create.useMutation();

  const [mode, setMode] = useState<Mode>("existing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [modelId, setModelId] = useState<string>("");
  const [modelUrl, setModelUrl] = useState<string>("");
  const [shareId, setShareId] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (mode === "existing") return !!modelId;
    return !!modelUrl.trim();
  }, [title, mode, modelId, modelUrl]);

  async function onCreate() {
    if (!canSubmit) return;
    const input: any = { title, description: description || undefined };
    if (mode === "existing") input.modelId = modelId;
    else input.modelUrl = modelUrl;
    const created = await create.mutateAsync(input);
    setShareId(created.id);
  }

  if (shareId) {
    const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${shareId}`;
    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold">Share created!</div>
        <div className="flex items-center gap-2">
          <Input value={shareLink} readOnly />
          <Button onClick={() => navigator.clipboard.writeText(shareLink)}>Copy</Button>
          <Link href={`/s/${shareId}`} className="underline">Open</Link>
        </div>
        <div className="rounded-md border p-4 inline-block">
          <QRCode value={shareLink} size={192} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Share title" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="mode" checked={mode === "existing"} onChange={() => setMode("existing")} />
            Use an existing model
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="mode" checked={mode === "url"} onChange={() => setMode("url")} />
            Provide a direct model URL
          </label>
        </div>

        {mode === "existing" ? (
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <select id="model" className="w-full rounded-md border bg-background p-2" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              <option value="">Select a model…</option>
              {(models ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="modelUrl">Model URL (.glb)</Label>
            <Input id="modelUrl" placeholder="https://…/file.glb" value={modelUrl} onChange={(e) => setModelUrl(e.target.value)} />
          </div>
        )}
      </div>

      <div>
        <Button onClick={onCreate} disabled={!canSubmit || create.isPending}>
          {create.isPending ? "Creating…" : "Create Share"}
        </Button>
      </div>
    </div>
  );
}


