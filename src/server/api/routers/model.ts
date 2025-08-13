import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const modelRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.model.findMany({ where: { ownerId: ctx.session.user.id } });
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.model.findFirst({
        where: { id: input.id, ownerId: ctx.session.user.id },
      });
    }),
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        glbStorageId: z.string(),
        usdzStorageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.model.create({
        data: {
          title: input.title,
          description: input.description,
          ownerId: ctx.session.user.id,
          glbStorageId: input.glbStorageId,
          usdzStorageId: input.usdzStorageId,
        },
      });
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.model.delete({
        where: { id: input.id },
      });
    }),
});
