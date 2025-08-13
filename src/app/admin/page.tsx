import { db } from "~/server/db";

export default async function AdminStatsPage() {
  const [userCount, modelCount] = await Promise.all([
    db.user.count(),
    db.model.count(),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-md bg-card p-4 text-card-foreground">
        <div className="text-sm opacity-70">Users</div>
        <div className="text-3xl font-bold">{userCount}</div>
      </div>
      <div className="rounded-md bg-card p-4 text-card-foreground">
        <div className="text-sm opacity-70">Models</div>
        <div className="text-3xl font-bold">{modelCount}</div>
      </div>
    </div>
  );
}


