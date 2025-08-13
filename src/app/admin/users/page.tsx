import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

export default async function AdminUsersPage() {
  const users = await api.admin.listUsers();
  return (
    <div className="space-y-4">
      <h1 className="[font-family:var(--font-display)] text-2xl">Users</h1>
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
            {users.map(
              (u: {
                id: string;
                name: string | null;
                email: string | null;
                role: "USER" | "EMPLOYEE" | "ADMIN";
              }) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">
                    <form
                      action={`/api/admin/users/${u.id}/role`}
                      method="post"
                      className="inline"
                    >
                      <input
                        type="hidden"
                        name="role"
                        value={u.role === "ADMIN" ? "USER" : "ADMIN"}
                      />
                      <Button type="submit" size="sm">
                        Make {u.role === "ADMIN" ? "USER" : "ADMIN"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
