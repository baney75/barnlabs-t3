import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({ orderBy: { createdAt: "desc" } });
  }),
  setRole: adminProcedure
    .input(z.object({ userId: z.string().cuid(), role: z.enum(["USER", "ADMIN"]) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
    }),
});


