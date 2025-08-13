import Link from "next/link";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import dynamic from "next/dynamic";
const EarthModel = dynamic(() => import("~/components/viewer/EarthModel"), { ssr: false });

import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export default async function Home() {
  const hello = await api.post.hello({ text: "from BarnLabs" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <main className="min-h-screen bg-[color:var(--color-hero-bg)] text-[color:var(--color-hero-text)]">
        {/* Header */}
        <header className="w-full border-b border-white/10 bg-[color:var(--color-header-bg)] text-[color:var(--color-header-text)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="[font-family:var(--font-display)] text-2xl font-bold">
              BarnLabs
            </div>
            <nav className="space-x-6 text-sm">
              <a href="#features">Features</a>
              <a href="#contact">Contact</a>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <h1 className="[font-family:var(--font-display)] text-4xl md:text-5xl">
              Unlock Deeper Understanding Through Immersive Learning
            </h1>
            <p className="opacity-90">{hello?.greeting}</p>

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
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  Loading...
                </div>
              }
            >
              <Canvas camera={{ position: [2.2, 1.2, 2.2], fov: 50 }}>
                <color attach="background" args={["#000000"]} />
                <ambientLight intensity={1.2} />
                <Stage intensity={0.3}>
                  <EarthModel />
                </Stage>
                <OrbitControls enablePan={false} />
              </Canvas>
            </Suspense>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="bg-[color:var(--color-features-bg)] py-12 text-black"
        >
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

        {/* Contact */}
        <section
          id="contact"
          className="bg-[color:var(--color-contact-bg)] py-12 text-[color:var(--color-contact-text)]"
        >
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 px-4 md:grid-cols-2">
            <div>
              <h2 className="mb-4 [font-family:var(--font-display)] text-2xl">
                Contact Us
              </h2>
              <p className="opacity-90">
                Have a project or a question? Send us a message.
              </p>
            </div>
            <form
              action="/api/contact"
              method="post"
              className="space-y-3 rounded-md bg-[color:var(--color-contact-form-bg)] p-4"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  className="text-[color:var(--color-contact-input-text)]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  className="text-[color:var(--color-contact-input-text)]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="text-[color:var(--color-contact-input-text)]"
                />
              </div>
              <input
                type="hidden"
                name="access_key"
                value="f73f7250-5451-499f-8e96-5669baece62c"
              />
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
