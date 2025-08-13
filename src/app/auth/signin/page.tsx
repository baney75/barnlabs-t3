"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onCredentials() {
    setLoading(true);
    try {
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 [font-family:var(--font-display)] text-3xl">
        Sign in
      </h1>
      <div className="space-y-3 rounded-md border p-4">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={onCredentials} disabled={loading}>
            Sign in
          </Button>
          <Button onClick={onGoogle} variant="secondary">
            Sign in with Google
          </Button>
        </div>
        <div className="text-sm opacity-80">
          <Link href="/auth/forgot" className="underline">
            Forgot your password?
          </Link>
        </div>
      </div>
    </main>
  );
}
