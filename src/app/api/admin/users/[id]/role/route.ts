import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const form = await req.formData();
  const role = String(form.get("role") ?? "");
  if (role !== "ADMIN" && role !== "USER") {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  await db.user.update({
    where: { id: resolvedParams.id },
    data: { role: role as any },
  });
  return NextResponse.redirect(new URL("/admin/users", req.url));
}
