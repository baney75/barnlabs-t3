import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const f = createUploadthing();

export const fileRouter = {
  modelFiles: f({
    "model/gltf-binary": { maxFileSize: "500MB" },
    "application/octet-stream": { maxFileSize: "500MB" },
    "model/vnd.usdz+zip": { maxFileSize: "500MB" },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new UploadThingError("UNAUTHORIZED");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Persist metadata for convenience; client will link via tRPC as well
      await db.dashboardAsset.create({
        data: {
          ownerId: metadata.userId,
          storageId: file.key,
          fileType: file.type ?? "application/octet-stream",
          fileName: file.name ?? file.key,
        },
      });
      return {
        key: file.key,
        url: file.url,
        type: file.type,
        size: (file as any).size ?? 0,
      };
    }),
  imageFiles: f({
    "image/*": { maxFileSize: "10MB" },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new UploadThingError("UNAUTHORIZED");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.dashboardAsset.create({
        data: {
          ownerId: metadata.userId,
          storageId: file.key,
          fileType: file.type ?? "image/*",
          fileName: file.name ?? file.key,
        },
      });
      return { key: file.key, url: file.url, type: file.type };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof fileRouter;
