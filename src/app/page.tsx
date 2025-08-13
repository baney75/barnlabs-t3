import NavBar from "~/components/NavBar";
import HeroCanvas from "~/components/hero/HeroCanvas";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export default async function Home({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await auth();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-[color:var(--color-hero-bg)] text-[color:var(--color-hero-text)]">
        {/* Header */}
        <NavBar />

        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="[font-family:var(--font-display)] text-4xl md:text-5xl">
              Unlock Deeper Understanding Through Immersive Learning
            </h1>
            <p className="opacity-90">
              Transforming education through immersive 3D experiences.
            </p>

            <div className="rounded-md bg-[color:var(--color-goals-bg)] p-4 text-[color:var(--color-header-text)]">
              <div className="font-semibold">Our Goals</div>
              <ul className="list-disc pl-6 text-sm opacity-90">
                <li>Build immersive 3D experiences for education</li>
                <li>Enable creators to share interactive models</li>
                <li>Empower admins to manage resources securely</li>
              </ul>
            </div>
          </div>
          <div className="h-[360px] rounded-lg bg-black/20">
            <HeroCanvas />
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                rel="ar"
                href="/Earth_Model.usdz"
                className="rounded-md bg-white px-3 py-1 text-sm text-black"
              >
                View in AR (iOS)
              </a>
              <a
                href={`intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent("/Earth_Model.glb")}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent("/Earth_Model.glb")};end;`}
                className="rounded-md bg-white px-3 py-1 text-sm text-black"
              >
                View in AR (Android)
              </a>
              <a
                href={`/vr360.html?src=${encodeURIComponent("/Earth_Model.glb")}`}
                target="_blank"
                className="rounded-md bg-white px-3 py-1 text-sm text-black"
              >
                Enter VR
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="bg-[color:var(--color-features-bg)] py-12 text-black"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-6 [font-family:var(--font-display)] text-3xl">
              Features
            </h2>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 md:grid-cols-3">
            {[
              {
                title: "Model Viewer",
                desc: "Render and explore 3D models on the web.",
              },
              {
                title: "Dashboard",
                desc: "Drag-and-drop cards with live markdown preview.",
              },
              {
                title: "Share Pages",
                desc: "Public pages with QR and creator branding.",
              },
            ].map((f) => (
              <Card
                key={f.title}
                className="bg-[color:var(--color-feature-card-bg)] text-[color:var(--color-feature-text)]"
              >
                <CardHeader>
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="opacity-90">{f.desc}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="h-3 w-full bg-[color:var(--color-divider-bg)]" />

        {/* Contact */}
        <section
          id="contact"
          className="bg-[color:var(--color-contact-bg)] py-14 text-[color:var(--color-contact-text)]"
        >
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="mb-2 [font-family:var(--font-display)] text-3xl">
              Contact Us
            </h2>
            {(() => {
              const status =
                typeof searchParams?.contact === "string"
                  ? searchParams?.contact
                  : undefined;
              if (!status) return null;
              return (
                <div
                  className={`mx-auto mb-4 w-fit rounded px-3 py-2 text-sm ${status === "success" ? "bg-green-600/20 text-green-200" : "bg-red-600/20 text-red-200"}`}
                >
                  {status === "success"
                    ? "Message sent! We'll be in touch."
                    : "There was a problem sending your message."}
                </div>
              );
            })()}
            <p className="mb-6 opacity-90">
              Have a project or a question? Send us a message.
            </p>
            <form
              action="/api/contact"
              method="post"
              className="mx-auto space-y-3 rounded-md bg-[color:var(--color-contact-form-bg)] p-4 text-left"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  className="bg-white text-black placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  className="bg-white text-black placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="bg-white text-black placeholder:text-gray-500"
                />
              </div>
              <Button className="bg-[color:var(--color-contact-button-bg)] text-black">
                Send
              </Button>
            </form>
          </div>
        </section>
      </main>
    </HydrateClient>
  );
}
