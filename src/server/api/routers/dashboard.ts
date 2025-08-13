/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  getMine: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    let doc = await ctx.db.dashboard.findFirst({
      where: { ownerId: ctx.session!.user.id },
    });
    if (!doc) {
      doc = await ctx.db.dashboard.create({
        data: {
          ownerId: ctx.session!.user.id,
          content: {
            cards: [
              {
                id: "welcome",
                type: "markdown",
                x: 0,
                y: 0,
                w: 6,
                h: 4,
                data: {
                  md: "# Welcome to BarnLabs\nEdit your dashboard and add cards.",
                },
              },
              {
                id: "model",
                type: "model",
                x: 6,
                y: 0,
                w: 6,
                h: 6,
                data: { src: "/Earth_Model.glb" },
              },
            ],
          },
        },
      });
    }
    return doc;
  }),

  save: protectedProcedure
    .input(z.object({ content: z.any() }))
    .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
      const updated = await ctx.db.dashboard.upsert({
        where: { ownerId: ctx.session!.user.id },
        create: { ownerId: ctx.session!.user.id, content: input.content },
        update: { content: input.content },
      });
      return updated;
    }),
});
