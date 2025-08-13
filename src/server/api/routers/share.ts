import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const shareRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        modelId: z.string().cuid().optional(),
        modelUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.share.create({
        data: {
          title: input.title,
          description: input.description,
          ownerId: ctx.session!.user.id,
          modelId: input.modelId,
          modelUrl: input.modelUrl,
        },
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.share.findUnique({
        where: { id: input.id },
        include: { model: true, owner: true },
      });
    }),
});
