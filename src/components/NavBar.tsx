"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function NavBar() {
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as { role?: "USER" | "ADMIN" } | undefined)?.role ===
    "ADMIN";
  return (
    <header className="w-full border-b border-white/10 bg-[color:var(--color-header-bg)] text-[color:var(--color-header-text)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        {/* @ts-expect-error next/link React 19 types */}
        <Link
          href="/"
          className="[font-family:var(--font-display)] text-2xl font-bold"
        >
          BarnLabs
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {/* @ts-expect-error next/link React 19 types */}
          <Link href="#features" className="hidden md:inline">
            Features
          </Link>
          {/* @ts-expect-error next/link React 19 types */}
          <Link href="#contact" className="hidden md:inline">
            Contact
          </Link>
          {session?.user && (
            // @ts-expect-error next/link React 19 types
            <Link href="/dashboard">Dashboard</Link>
          )}
          {isAdmin && (
            // @ts-expect-error next/link React 19 types
            <Link href="/admin">Admin</Link>
          )}
          {!session?.user ? (
            // @ts-expect-error next/link React 19 types
            <Link href="/auth/signin" className="underline">
              Sign in
            </Link>
          ) : (
            // @ts-expect-error next/link React 19 types
            <Link href="/api/auth/signout" className="underline">
              Sign out
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
