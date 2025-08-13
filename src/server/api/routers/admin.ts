 
import { z } from "zod";
import { type Role } from "@prisma/client";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";




export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({ orderBy: { createdAt: "desc" } });
  }),
  setRole: adminProcedure
    .input(
      z.object({ userId: z.string().cuid(), role: z.enum(["USER", "EMPLOYEE", "ADMIN"]) }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role as Role },
      });
      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.session.user.id,
          event: "USER_ROLE_CHANGED",
          details: { targetUserId: input.userId, newRole: input.role },
        },
      });
      return updated;
    }),
});
