"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bootstrapChecked, setBootstrapChecked] = useState(false);

  const { data: bootstrapStatus, isLoading: bootstrapLoading } =
    api.auth.ensureAdminBootstrap.useQuery(undefined, {
      enabled: status !== "loading",
    });

  useEffect(() => {
    if (status === "loading" || bootstrapLoading) return;

    // If bootstrap is needed, redirect to setup page
    if (bootstrapStatus?.needed) {
      router.replace("/admin/setup");
      return;
    }

    // Otherwise, check for admin role
    const role = (session?.user as { role?: "USER" | "ADMIN" } | undefined)
      ?.role;
    if (!session?.user) {
      router.replace("/auth/signin?callbackUrl=%2Fadmin");
      return;
    }
    if (role !== "ADMIN") {
      router.replace("/");
      return;
    }

    setBootstrapChecked(true);
  }, [session, status, router, bootstrapStatus, bootstrapLoading]);

  if (status === "loading" || bootstrapLoading || !bootstrapChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
