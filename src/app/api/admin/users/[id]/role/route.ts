import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const form = await req.formData();
  const role = form.get("role")?.toString();
  if (role !== "ADMIN" && role !== "USER") {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  await db.user.update({ where: { id: params.id }, data: { role: role as any } });
  return NextResponse.redirect(new URL("/admin/users", req.url));
}


