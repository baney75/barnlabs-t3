import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { PrismaClient } from "@prisma/client";
import { env } from "~/env";
import { sendPasswordResetEmail } from "~/server/email/resend";

const PASSWORD_MIN = 8;

export const authRouter = createTRPCRouter({
  // Admin bootstrap: if no ADMIN exists, allow creating the first one with a console-logged key in dev
  ensureAdminBootstrap: publicProcedure.query(
    async ({ ctx }: { ctx: { db: PrismaClient } }) => {
      const anyAdmin = await ctx.db.user.findFirst({
        where: { role: "ADMIN" },
      });
      if (anyAdmin) return { needed: false };
      const token = randomBytes(16).toString("hex");
      const expires = new Date(Date.now() + 10 * 60 * 1000);
      await ctx.db.verificationToken.upsert({
        where: { identifier_token: { identifier: "admin-bootstrap", token } },
        create: { identifier: "admin-bootstrap", token, expires },
        update: { token, expires },
      });
      console.log("[ADMIN-BOOTSTRAP] token:", token);
      return { needed: true };
    },
  ),
  completeAdminBootstrap: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        password: z.string().min(PASSWORD_MIN),
        token: z.string().min(16),
      }),
    )
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: { db: PrismaClient };
        input: {
          email: string;
          name?: string;
          password: string;
          token: string;
        };
      }) => {
        const rec = await ctx.db.verificationToken.findUnique({
          where: {
            identifier_token: {
              identifier: "admin-bootstrap",
              token: input.token,
            },
          },
        });
        if (!rec || rec.expires < new Date()) return { ok: false };
        const exists = await ctx.db.user.findUnique({
          where: { email: input.email },
        });
        if (exists) return { ok: false };
        const passwordHash = await hash(input.password, 10);
        await ctx.db.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash,
            role: "ADMIN",
          },
        });
        await ctx.db.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: "admin-bootstrap",
              token: input.token,
            },
          },
        });
        return { ok: true };
      },
    ),
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: { db: PrismaClient };
        input: { email: string };
      }) => {
        const user = await ctx.db.user.findUnique({
          where: { email: input.email },
        });
        // Avoid leaking whether a user exists
        if (!user?.id) return { ok: true };

        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

        await ctx.db.verificationToken.create({
          data: { identifier: `reset:${user.id}`, token, expires: expiresAt },
        });

        if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
          await sendPasswordResetEmail({
            to: input.email,
            token,
          });
        }

        return { ok: true };
      },
    ),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(16),
        newPassword: z.string().min(PASSWORD_MIN),
      }),
    )
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: { db: PrismaClient };
        input: { token: string; newPassword: string };
      }) => {
        const record = await ctx.db.verificationToken.findFirst({
          where: { token: input.token, identifier: { startsWith: "reset:" } },
        });
        if (!record || record.expires < new Date()) {
          return { ok: false };
        }
        const passwordHash = await hash(input.newPassword, 10);
        await ctx.db.user.update({
          where: { id: record.identifier.split(":")[1]! },
          data: { passwordHash },
        });
        // burn token
        await ctx.db.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: record.identifier,
              token: input.token,
            },
          },
        });
        return { ok: true };
      },
    ),
});
