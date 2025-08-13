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
  suggestUsdz: protectedProcedure
    .input(z.object({ glbSizeBytes: z.number().int().positive() }))
    .query(async ({ input }) => {
      // If GLB > 25MB, suggest USDZ companion for iOS AR
      return { requireUsdz: input.glbSizeBytes > 25 * 1024 * 1024 };
    }),

  deleteModel: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const role = (ctx.session?.user as { role?: "USER" | "EMPLOYEE" | "ADMIN" } | undefined)?.role;
      const model = await ctx.db.model.findUnique({ where: { id: input.id } });
      if (!model) return { ok: false };
      const owned = model.ownerId === ctx.session.user.id;
      if (!(owned || role === "ADMIN" || role === "EMPLOYEE")) {
        throw new Error("FORBIDDEN");
      }
      await ctx.db.model.delete({ where: { id: input.id } });
      await ctx.db.auditLog.create({
        data: {
          actorId: ctx.session.user.id,
          event: "FILE_DELETED",
          details: { modelId: input.id, ownerId: model.ownerId },
        },
      });
      return { ok: true };
    }),
});
