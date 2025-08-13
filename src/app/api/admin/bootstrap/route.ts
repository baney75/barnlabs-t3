import { NextResponse } from "next/server";
import { createTRPCContext } from "~/server/api/trpc";
import { createCaller } from "~/server/api/root";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email: string;
      name?: string;
      password: string;
      token: string;
    };
    const caller = createCaller(async () =>
      createTRPCContext({ headers: req.headers as Headers }),
    );
    const result = await caller.auth.completeAdminBootstrap(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
