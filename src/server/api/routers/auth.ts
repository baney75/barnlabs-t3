import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import { sendPasswordResetEmail } from "~/server/email/resend";

const PASSWORD_MIN = 8;

export const authRouter = createTRPCRouter({
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { email: input.email } });
      // Avoid leaking whether a user exists
      if (!user?.id) return { ok: true };

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await ctx.db.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt },
      });

      if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
        await sendPasswordResetEmail({
          to: input.email,
          token,
        });
      }

      return { ok: true };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(16),
        newPassword: z.string().min(PASSWORD_MIN),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.passwordResetToken.findUnique({
        where: { token: input.token },
      });
      if (!record || record.expiresAt < new Date()) {
        return { ok: false };
      }
      const passwordHash = await hash(input.newPassword, 10);
      await ctx.db.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      // burn token
      await ctx.db.passwordResetToken.delete({ where: { token: input.token } });
      return { ok: true };
    }),
});


