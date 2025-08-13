"use client";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
// Suppress type friction for React 19
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

const ResponsiveGridLayout = dynamic(
  async () => (await import("react-grid-layout")).Responsive as any,
  { ssr: false },
);
const WidthProvider = dynamic(
  async () => (await import("react-grid-layout")).WidthProvider as any,
  { ssr: false },
);
const RGL = (props: any) => {
  const Comp: any = useMemo(
    () => (WidthProvider as any)(ResponsiveGridLayout as any),
    [],
  );
  return <Comp {...props} />;
};

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

export default function DashboardClient({
  initialContent,
}: {
  initialContent: DashboardContent;
}) {
  const [content, setContent] = useState<DashboardContent>(
    initialContent ?? { cards: [] },
  );
  const save = api.dashboard.save.useMutation();
  const updateLogo = api.user.updateProfile.useMutation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => save.mutate({ content })}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving..." : "Save"}
        </Button>
        <label className="text-sm">
          Change logo/icon
          <input
            type="file"
            accept="image/*"
            className="ml-2 text-xs"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = async () => {
                const url = String(reader.result ?? "");
                await updateLogo.mutateAsync({ image: url });
              };
              reader.readAsDataURL(f);
            }}
          />
        </label>
      </div>

      <RGL
        className="layout"
        rowHeight={40}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        layouts={{
          lg: content.cards.map((c) => ({
            i: c.id,
            x: c.x,
            y: c.y,
            w: c.w,
            h: c.h,
          })),
        }}
        onLayoutChange={(layout: any[]) => {
          setContent((prev) => ({
            cards: prev.cards.map((c) => {
              const l = layout.find((i) => i.i === c.id);
              return l ? { ...c, x: l.x, y: l.y, w: l.w, h: l.h } : c;
            }),
          }));
        }}
      >
        {content.cards.map((card) => (
          <div
            key={card.id}
            data-grid={{ x: card.x, y: card.y, w: card.w, h: card.h }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base capitalize">
                  {card.type} card
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-auto">
                {card.type === "markdown" && (
                  <div className="grid gap-2 md:grid-cols-2">
                    <Textarea
                      defaultValue={card.data?.md ?? ""}
                      onChange={(e) => {
                        const md = e.target.value;
                        setContent((prev) => ({
                          cards: prev.cards.map((c) =>
                            c.id === card.id
                              ? { ...c, data: { ...c.data, md } }
                              : c,
                          ),
                        }));
                      }}
                      rows={10}
                    />
                    <div className="prose max-w-none bg-white p-3 text-black">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                      >
                        {String(card.data?.md ?? "")}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {card.type === "video" && (
                  <div className="space-y-2">
                    <Input
                      placeholder="YouTube URL"
                      defaultValue={card.data?.url ?? ""}
                      onChange={(e) =>
                        setContent((prev) => ({
                          cards: prev.cards.map((c) =>
                            c.id === card.id
                              ? {
                                  ...c,
                                  data: { ...c.data, url: e.target.value },
                                }
                              : c,
                          ),
                        }))
                      }
                    />
                    {typeof card.data?.url === "string" && card.data.url && (
                      <iframe
                        className="aspect-video w-full"
                        src={String(card.data.url).replace(
                          "watch?v=",
                          "embed/",
                        )}
                        allowFullScreen
                      />
                    )}
                  </div>
                )}

                {card.type === "pdf" && (
                  <div className="h-full">
                    <Input
                      placeholder="/path/to.pdf"
                      defaultValue={card.data?.src ?? ""}
                      onChange={(e) =>
                        setContent((prev) => ({
                          cards: prev.cards.map((c) =>
                            c.id === card.id
                              ? {
                                  ...c,
                                  data: { ...c.data, src: e.target.value },
                                }
                              : c,
                          ),
                        }))
                      }
                    />
                    {typeof card.data?.src === "string" && card.data.src && (
                      <iframe
                        className="mt-2 h-[400px] w-full"
                        src={String(card.data.src)}
                      />
                    )}
                  </div>
                )}

                {card.type === "model" && (
                  <div className="space-y-2">
                    <Input
                      placeholder="/Earth_Model.glb"
                      defaultValue={card.data?.src ?? ""}
                      onChange={(e) =>
                        setContent((prev) => ({
                          cards: prev.cards.map((c) =>
                            c.id === card.id
                              ? {
                                  ...c,
                                  data: { ...c.data, src: e.target.value },
                                }
                              : c,
                          ),
                        }))
                      }
                    />
                    <div className="text-sm opacity-70">
                      3D preview coming soon.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </RGL>
    </div>
  );
}
