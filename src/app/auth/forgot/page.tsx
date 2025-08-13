"use client";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const request = api.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
  });

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 [font-family:var(--font-display)] text-3xl">Reset password</h1>
      <div className="space-y-3 rounded-md border p-4">
        {sent ? (
          <div className="text-sm">If an account exists for {email}, a reset link has been sent.</div>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button onClick={() => request.mutate({ email })} disabled={!email || request.isPending}>Send reset link</Button>
          </>
        )}
      </div>
    </main>
  );
}


