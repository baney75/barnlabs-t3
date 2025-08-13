 
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const cardDataSchema = z.union([
  z.object({ md: z.string() }), // For markdown type
  z.object({ src: z.string() }), // For model type
  // Add other card data schemas as needed
]);

const cardSchema = z.object({
  id: z.string(),
  type: z.string(), // Could be more specific with z.enum(["markdown", "model", ...])
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  data: cardDataSchema,
});

const dashboardContentSchema = z.object({
  cards: z.array(cardSchema),
});

export const dashboardRouter = createTRPCRouter({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    let doc = await ctx.db.dashboard.findFirst({
      where: { ownerId: ctx.session.user.id },
    });

    doc ??= await ctx.db.dashboard.create({
      data: {
        ownerId: ctx.session.user.id,
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
    // Removed the extra closing brace here

    return doc;
  }),

  save: protectedProcedure
    .input(z.object({ content: dashboardContentSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.dashboard.findFirst({
        where: { ownerId: ctx.session.user.id },
      });

      if (!existing) {
        const created = await ctx.db.dashboard.create({
          data: { ownerId: ctx.session.user.id, content: input.content },
        });
        return created;
      }

      const updated = await ctx.db.dashboard.update({
        where: { id: existing.id },
        data: { content: input.content },
      });
      return updated;
    }),
});
