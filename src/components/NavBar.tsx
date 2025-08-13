"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function NavBar() {
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as { role?: "USER" | "ADMIN" } | undefined)?.role ===
    "ADMIN";
  const [open, setOpen] = useState(false);
  return (
    <header className="w-full border-b border-white/10 bg-[color:var(--color-header-bg)] text-[color:var(--color-header-text)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="[font-family:var(--font-display)] text-2xl font-bold"
        >
          BarnLabs
        </Link>
        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/trecf">TRECf</Link>
          <Link href="#features">Features</Link>
          <Link href="#contact">Contact</Link>
          {session?.user && <Link href="/dashboard">Dashboard</Link>}
          {isAdmin && <Link href="/admin">Admin</Link>}
          {!session?.user ? (
            <Link href="/auth/signin" className="underline">
              Sign in
            </Link>
          ) : (
            <Link href="/api/auth/signout" className="underline">
              Sign out
            </Link>
          )}
        </nav>
        {/* Mobile hamburger */}
        <button
          aria-label="Menu"
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block h-0.5 w-6 bg-current" />
          <span className="mt-1 block h-0.5 w-6 bg-current" />
          <span className="mt-1 block h-0.5 w-6 bg-current" />
        </button>
      </div>
      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden">
          <nav className="mx-auto max-w-6xl space-y-3 px-4 pb-4 text-sm">
            <Link
              onClick={() => setOpen(false)}
              href="/trecf"
              className="block"
            >
              TRECf
            </Link>
            <Link
              onClick={() => setOpen(false)}
              href="#features"
              className="block"
            >
              Features
            </Link>
            <Link
              onClick={() => setOpen(false)}
              href="#contact"
              className="block"
            >
              Contact
            </Link>
            {session?.user && (
              <Link
                onClick={() => setOpen(false)}
                href="/dashboard"
                className="block"
              >
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link
                onClick={() => setOpen(false)}
                href="/admin"
                className="block"
              >
                Admin
              </Link>
            )}
            {!session?.user ? (
              <Link
                onClick={() => setOpen(false)}
                href="/auth/signin"
                className="block underline"
              >
                Sign in
              </Link>
            ) : (
              <Link
                onClick={() => setOpen(false)}
                href="/api/auth/signout"
                className="block underline"
              >
                Sign out
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
