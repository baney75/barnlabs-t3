import { adminRouter } from "~/server/api/routers/admin";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

export default async function AdminUsersPage() {
  const users = await api.admin.listUsers();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl [font-family:var(--font-display)]">Users</h1>
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{(u as any).role}</td>
                <td className="p-2">
                  <form action={`/api/admin/users/${u.id}/role`} method="post" className="inline">
                    <input type="hidden" name="role" value={(u as any).role === "ADMIN" ? "USER" : "ADMIN"} />
                    <Button type="submit" size="sm">
                      Make {(u as any).role === "ADMIN" ? "USER" : "ADMIN"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


