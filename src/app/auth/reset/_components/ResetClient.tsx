"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

export default function ResetClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const mutate = api.auth.resetPassword.useMutation({ onSuccess: () => setDone(true) });

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 [font-family:var(--font-display)] text-3xl">Set new password</h1>
      <div className="space-y-3 rounded-md border p-4">
        {done ? (
          <div className="space-y-2">
            <div>Password updated.</div>
            <Button onClick={() => router.push("/auth/signin")}>Go to sign in</Button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button onClick={() => mutate.mutate({ token, newPassword: password })} disabled={!password || mutate.isPending}>Update password</Button>
          </>
        )}
      </div>
    </main>
  );
}
