// src/routes/model.ts
// NOTE: File conversion & optimisation requires Node.js environment with file system and gltf-transform CLI.
// Cloudflare Workers cannot spawn child processes, therefore this endpoint acts as a façade returning
// 501 Not Implemented when running in the Worker. In a self-hosted Node server you can adapt this route
// to call the optimiseModel utility directly.

import { Hono } from "hono";
import type { Env, Variables } from "../types";

export function addModelRoutes(
  app: Hono<{ Bindings: Env; Variables: Variables }>,
) {
  // POST /api/model/convert — multipart/form-data { file }
  app.post("/convert", async (c) => {
    return c.json(
      {
        error:
          "Model conversion should be performed locally to avoid Cloudflare Worker limitations",
        message:
          "For files over 50MB, conversion is unlikely to work due to memory and processing limits. Please use a local conversion tool or upload both GLB and USDZ versions of your model with the same name for optimal cross-platform support.",
        recommendation:
          "Upload companion files: If you have 'model.glb', also upload 'model.usdz' with the same base name for iOS QuickLook support.",
      },
      501,
    );

    // Legacy conversion code disabled for Cloudflare Workers
    /*
    if (!(globalThis as any).process) {
      return c.json(
        { error: "Conversion not supported in this environment" },
        501
      );
    }

    // Parse multipart using formData (Workers) or busboy (Node). Here we use Workers FormData.
    const form = await c.req.formData();
    const file = form.get("file") as File | null;
    if (!file) return c.json({ error: "file field required" }, 400);

    // Check file size limit (50MB)
    const MAX_CONVERSION_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_CONVERSION_SIZE) {
      return c.json({
        error: "File too large for conversion",
        message: `Files over 50MB (${Math.round(file.size / 1024 / 1024)}MB provided) are unlikely to convert successfully. Please upload both GLB and USDZ versions manually.`,
        file_size_mb: Math.round(file.size / 1024 / 1024),
        max_size_mb: 50
      }, 413);
    }

    // Save temp file
    const tmpIn = `/tmp/${Date.now()}_${file.name}`;
    const tmpOut = tmpIn.replace(/\.[^/.]+$/, "") + ".glb";

    const { writeFile, readFile, unlink } = await import("node:fs/promises");
    await writeFile(tmpIn, Buffer.from(await file.arrayBuffer()));

    try {
      // Dynamic import to avoid build errors in Cloudflare Workers
      const { optimizeModel } = await import("../utils/optimizer");
      optimizeModel(tmpIn, tmpOut, {
        draco: true,
        meshopt: true,
        textureCompress: "ktx2",
        maxTextureSize: 1024,
      });
      
      const data = await readFile(tmpOut);
      // TODO: upload to R2 or S3 and return signed URL
      return new Response(data, {
        headers: {
          "content-type": "model/gltf-binary",
          "content-disposition": `attachment; filename=optimized.glb`,
        },
      });
    } catch (e) {
      console.error("optimizeModel error", e);
      return c.json({ error: "Optimization failed" }, 500);
    } finally {
      // Cleanup
      try {
        await unlink(tmpIn);
      } catch {}
      try {
        await unlink(tmpOut);
      } catch {}
    }
    */
  });

  return app;
}
