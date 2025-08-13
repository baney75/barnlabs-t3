/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure.query(async ({ ctx }: { ctx: any }) => {
    return ctx.db.user.findMany({ orderBy: { createdAt: "desc" } });
  }),
  setRole: adminProcedure
    .input(
      z.object({ userId: z.string().cuid(), role: z.enum(["USER", "ADMIN"]) }),
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
    }),
});
