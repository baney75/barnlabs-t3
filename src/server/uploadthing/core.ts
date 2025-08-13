/* eslint-disable @typescript-eslint/no-unused-vars */
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const f = createUploadthing();

export const ourFileRouter = {
  modelFiles: f({
    "model/gltf-binary": { maxFileSize: "64MB", maxFileCount: 1 },
    "application/octet-stream": { maxFileSize: "64MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      const session = await auth();
      if (!session?.user) {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      const userId = metadata.userId;
      const key = file.key;
      const type = file.type;
      const name = file.name ?? file.key;

      // Store in database  
      await db.model.create({
        data: {
          title: name,
          description: `Uploaded ${type} model`,
          ownerId: userId,
          glbStorageId: file.key, // Store the key as storageId
          usdzStorageId: null,
        },
      });

      return { uploadedBy: metadata.userId };
    }),

  imageFiles: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const session = await auth();
      if (!session?.user) {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image upload complete for userId:", metadata.userId);

      const userId = metadata.userId;
      const key = file.key;
      const type = file.type;
      const name = file.name ?? file.key;

      return { key: file.key, url: file.url, type: file.type };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;