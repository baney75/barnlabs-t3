import Link from "next/link";
import AdminGuard from "~/app/admin/_components/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b bg-[color:var(--color-header-bg)] text-[color:var(--color-header-text)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div className="[font-family:var(--font-display)] text-2xl font-bold">BarnLabs Admin</div>
            <nav className="space-x-6 text-sm">
              <Link href="/admin">Stats</Link>
              <Link href="/admin/users">User Editor</Link>
              <Link href="/admin/resources">Resource Manager</Link>
              <Link href="/admin/email">Email</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </div>
    </AdminGuard>
  );
}


