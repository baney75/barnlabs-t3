import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Placeholder router for UploadThing-related metadata operations
export const uploadRouter = createTRPCRouter({
  attachModelFile: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        fileKeyGlb: z.string(),
        fileKeyUsdz: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.model.create({
        data: {
          title: input.title,
          description: input.description,
          ownerId: ctx.session.user.id,
          glbStorageId: input.fileKeyGlb,
          usdzStorageId: input.fileKeyUsdz,
        },
      });
    }),
});
