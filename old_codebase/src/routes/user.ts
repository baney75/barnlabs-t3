// src/routes/user.ts
import { Hono } from "hono";
import {
  handleFileUpload,
  handleGetPresignedUrl,
  handleAssetUploadComplete,
  autoLinkUsdzFiles,
  checkAndNotifyCompanionFile,
} from "../utils/upload";
import { logEvent } from "../utils/log";
import { SignJWT } from "jose";
import { verifyToken } from "../middleware/auth";
import type { Env, Variables, AssetRow } from "../types";

// MODIFIED: This file now exports a function to add routes to the main app.
export function addUserRoutes(
  app: Hono<{ Bindings: Env; Variables: Variables }>,
) {
  // Apply middleware to all user routes
  app.use("*", verifyToken);

  // POST /api/user/asset/upload: User file upload.
  app.post("/asset/upload", (c) => handleFileUpload(c, false));

  // POST /api/user/asset/presigned-upload-url
  app.post("/asset/presigned-upload-url", (c) =>
    handleGetPresignedUrl(c, false),
  );

  // POST /api/user/asset/upload-complete
  app.post("/asset/upload-complete", (c) =>
    handleAssetUploadComplete(c, false),
  );

  // --- Multipart Upload (large files) for users ---
  // POST /api/user/mpu/create - begin multipart upload, returns { key, uploadId }
  app.post("/mpu/create", async (c) => {
    try {
      const user = c.get("user");
      const { fileName, mimeType } = await c.req.json<{
        fileName: string;
        mimeType: string;
      }>();
      if (!fileName || !mimeType) {
        return c.json({ error: "fileName and mimeType are required" }, 400);
      }

      const ext = (fileName.split(".").pop() || "").toLowerCase();
      const type =
        ext === "glb" || ext === "gltf"
          ? "model"
          : ["png", "jpg", "jpeg", "svg"].includes(ext)
            ? "image"
            : ["mp4", "webm"].includes(ext)
              ? "video"
              : ext === "pdf"
                ? "pdf"
                : "document";

      const uuid = crypto.randomUUID();
      const timestamp = Date.now();
      const key = `${type}/${timestamp}_${uuid}.${ext}`;

      const mpu = await c.env.ASSETS.createMultipartUpload(key, {
        httpMetadata: { contentType: mimeType },
        customMetadata: { uploadedBy: String(user.id), originalName: fileName },
      });

      await logEvent(c.env, "mpu:create", "info", {
        user_id: user.id,
        username: user.username,
        asset_key: key,
        file_name: fileName,
        mime: mimeType,
      });

      return c.json({ key: mpu.key, uploadId: mpu.uploadId });
    } catch (error) {
      console.error("user mpu-create error:", error);
      return c.json({ error: "Failed to create multipart upload" }, 500);
    }
  });

  // PUT /api/user/mpu/uploadpart?key=...&uploadId=...&partNumber=...
  app.put("/mpu/uploadpart", async (c) => {
    try {
      const url = new URL(c.req.url);
      const key = url.searchParams.get("key");
      const uploadId = url.searchParams.get("uploadId");
      const partNumberStr = url.searchParams.get("partNumber");
      if (!key || !uploadId || !partNumberStr) {
        return c.json({ error: "Missing key, uploadId or partNumber" }, 400);
      }
      const partNumber = parseInt(partNumberStr, 10);
      const body = c.req.raw.body;
      if (!body) return c.json({ error: "Missing request body" }, 400);

      const mpu = c.env.ASSETS.resumeMultipartUpload(key, uploadId);
      const uploadedPart = await mpu.uploadPart(partNumber, body);

      await logEvent(c.env, "mpu:uploadpart", "debug", {
        asset_key: key,
        detail: `part=${partNumber}`,
      });

      return c.json(uploadedPart);
    } catch (error) {
      console.error("user mpu-uploadpart error:", error);
      return c.json({ error: "Failed to upload part" }, 400);
    }
  });

  // POST /api/user/mpu/complete - body: { key, uploadId, parts, originalName, size }
  app.post("/mpu/complete", async (c) => {
    try {
      const user = c.get("user");
      const { key, uploadId, parts, originalName, size } = await c.req.json<{
        key: string;
        uploadId: string;
        parts: { partNumber: number; etag: string }[];
        originalName?: string;
        size?: number;
      }>();
      if (!key || !uploadId || !parts?.length) {
        return c.json({ error: "Missing key, uploadId or parts" }, 400);
      }

      const mpu = c.env.ASSETS.resumeMultipartUpload(key, uploadId);
      const object = await mpu.complete(parts);

      // Derive metadata for DB
      const ext = (
        originalName?.split(".").pop() ||
        key.split(".").pop() ||
        ""
      ).toLowerCase();
      const fileType =
        ext === "glb" || ext === "gltf"
          ? "model"
          : ["png", "jpg", "jpeg", "svg"].includes(ext)
            ? "image"
            : ["mp4", "webm"].includes(ext)
              ? "video"
              : ext === "pdf"
                ? "pdf"
                : "document";

      const objectSize =
        typeof size === "number"
          ? size
          : ((object as unknown as { size?: number }).size ?? 0);
      const nameForDb = originalName ?? key.split("/").pop() ?? key;

      await c.env.DB.prepare(
        `INSERT INTO assets (user_id, r2_key, file_name, file_type, size, upload_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          user.id,
          key,
          nameForDb,
          fileType,
          objectSize,
          new Date().toISOString(),
        )
        .run();

      await logEvent(c.env, "mpu:complete", "info", {
        user_id: user.id,
        username: user.username,
        asset_key: key,
        file_name: nameForDb,
        file_type: fileType,
        size: objectSize,
      });

      // Auto-link companion GLB/USDZ files and notify user of suggestions (if needed)
      try {
        await autoLinkUsdzFiles(c as unknown as any, key, user.id);
      } catch (linkErr) {
        console.warn("Auto-linking (user) failed:", linkErr);
      }
      try {
        await checkAndNotifyCompanionFile(
          c as unknown as any,
          key,
          nameForDb,
          objectSize,
          user.id,
        );
      } catch (notifyErr) {
        console.warn("Companion suggestion (user) failed:", notifyErr);
      }

      return c.json({
        success: true,
        key,
        url: `/model/${encodeURIComponent(key)}`,
      });
    } catch (error) {
      console.error("user mpu-complete error:", error);
      return c.json({ error: "Failed to complete multipart upload" }, 400);
    }
  });

  // DELETE /api/user/mpu/abort?key=...&uploadId=...
  app.delete("/mpu/abort", async (c) => {
    try {
      const url = new URL(c.req.url);
      const key = url.searchParams.get("key");
      const uploadId = url.searchParams.get("uploadId");
      if (!key || !uploadId)
        return c.json({ error: "Missing key or uploadId" }, 400);
      const mpu = c.env.ASSETS.resumeMultipartUpload(key, uploadId);
      await mpu.abort();

      await logEvent(c.env, "mpu:abort", "warn", { asset_key: key });

      return c.json({ success: true });
    } catch (error) {
      console.error("user mpu-abort error:", error);
      return c.json({ error: "Failed to abort multipart upload" }, 400);
    }
  });

  // DELETE /api/user/asset/:name: Delete user asset.
  app.delete("/asset/:name", async (c) => {
    const user = c.get("user");
    const name = c.req.param("name");

    try {
      const existing = await c.env.DB.prepare(
        "SELECT * FROM assets WHERE r2_key = ? AND user_id = ?",
      )
        .bind(name, user.id)
        .first();

      if (!existing)
        return c.json({ error: "Asset not found or not owned by user" }, 404);

      await c.env.DB.prepare("DELETE FROM assets WHERE r2_key = ?")
        .bind(name)
        .run();
      await c.env.ASSETS.delete(name);

      await logEvent(c.env, `User ${user.username} deleted asset: ${name}`);
      return c.json({ success: true, message: "Asset deleted successfully" });
    } catch (e: unknown) {
      await logEvent(
        c.env,
        `Error deleting asset: ${(e as Error).message}`,
        "error",
      );
      return c.json({ error: "Failed to delete asset" }, 500);
    }
  });

  // USDZ conversion/linking endpoint with size threshold handling
  app.get("/asset/usdz", async (c) => {
    try {
      const key = c.req.query("key");
      if (!key) {
        return c.json({ error: "Missing key parameter" }, 400);
      }

      const user = c.get("user");

      // Check if the asset belongs to the user
      const asset = await c.env.DB.prepare(
        "SELECT * FROM assets WHERE r2_key = ? AND user_id = ?",
      )
        .bind(key, user.id)
        .first<{
          r2_key: string;
          file_name: string;
          file_type: string;
          size: number;
          user_id: number;
        }>();

      if (!asset) {
        return c.json({ error: "Asset not found" }, 404);
      }

      // If it's already a USDZ file, return it directly
      if (key.endsWith(".usdz")) {
        return c.json({
          success: true,
          usdzUrl: `/model/${encodeURIComponent(key)}`,
        });
      }

      // Check if there's already a linked USDZ file
      const existingUsdz = await c.env.DB.prepare(
        "SELECT usdz_key FROM assets WHERE r2_key = ?",
      )
        .bind(key)
        .first<{ usdz_key: string | null }>();

      if (existingUsdz?.usdz_key) {
        return c.json({
          success: true,
          usdzUrl: `/model/${encodeURIComponent(existingUsdz.usdz_key)}`,
        });
      }

      // File size threshold for auto-conversion (100MB)
      const SIZE_THRESHOLD = 100 * 1024 * 1024; // 100MB
      const isLargeFile = asset.size > SIZE_THRESHOLD;

      // Look for a USDZ file with the same base name
      const baseName = key.replace(/\.[^/.]+$/, ""); // Remove extension
      const usdzKey = `${baseName}.usdz`;

      // Check if the USDZ file exists in R2
      try {
        const usdzObject = await c.env.ASSETS.head(usdzKey);
        if (usdzObject) {
          // Link the files in the database
          await c.env.DB.prepare(
            "UPDATE assets SET usdz_key = ? WHERE r2_key = ?",
          )
            .bind(usdzKey, key)
            .run();

          return c.json({
            success: true,
            usdzUrl: `/model/${encodeURIComponent(usdzKey)}`,
            linked: true,
          });
        }
      } catch (r2Error) {
        // USDZ file doesn't exist, that's fine
      }

      // No USDZ file found - provide appropriate response based on file size
      if (isLargeFile) {
        return c.json(
          {
            success: false,
            requiresManualUpload: true,
            fileSize: asset.size,
            fileSizeMB: Math.round(asset.size / 1024 / 1024),
            threshold: SIZE_THRESHOLD,
            thresholdMB: Math.round(SIZE_THRESHOLD / 1024 / 1024),
            baseName: asset.file_name.replace(/\.[^/.]+$/, ""),
            error: `File is too large (${Math.round(asset.size / 1024 / 1024)}MB) for auto-conversion. Please upload a USDZ file named "${asset.file_name.replace(/\.[^/.]+$/, "")}.usdz" to enable iOS AR support.`,
            uploadInstructions: {
              step1: `Convert your ${asset.file_name} to USDZ format using Reality Converter (macOS) or other USDZ conversion tools`,
              step2: `Name the USDZ file exactly: "${asset.file_name.replace(/\.[^/.]+$/, "")}.usdz"`,
              step3: `Upload the USDZ file to automatically link it with your GLB model`,
              step4: "iOS AR will then work seamlessly for this model",
            },
          },
          200, // 200 OK with instructions, not 404
        );
      } else {
        return c.json(
          {
            success: false,
            requiresManualUpload: true,
            fileSize: asset.size,
            fileSizeMB: Math.round(asset.size / 1024 / 1024),
            baseName: asset.file_name.replace(/\.[^/.]+$/, ""),
            error: `No USDZ file found. Please upload a USDZ file named "${asset.file_name.replace(/\.[^/.]+$/, "")}.usdz" to enable iOS AR support.`,
            uploadInstructions: {
              step1: `Convert your ${asset.file_name} to USDZ format`,
              step2: `Name the USDZ file exactly: "${asset.file_name.replace(/\.[^/.]+$/, "")}.usdz"`,
              step3: `Upload the USDZ file to automatically link it with your GLB model`,
            },
          },
          200,
        );
      }
    } catch (error) {
      console.error("USDZ endpoint error:", error);
      return c.json({ error: "Failed to process USDZ request" }, 500);
    }
  });

  // Get companion file suggestions for uploaded models
  app.get("/companion-suggestions", async (c) => {
    try {
      const user = c.get("user");

      // Get all GLB and USDZ files for the user
      const assets = await c.env.DB.prepare(
        `SELECT r2_key, file_name, file_type, size, upload_date 
         FROM assets 
         WHERE user_id = ? AND file_type = 'model' 
         AND (r2_key LIKE '%.glb' OR r2_key LIKE '%.usdz')
         ORDER BY upload_date DESC`,
      )
        .bind(user.id)
        .all();

      const suggestions = [];
      const SIZE_THRESHOLD = 100 * 1024 * 1024; // 100MB

      for (const asset of (assets.results as any[]) || []) {
        const baseName = asset.file_name.replace(/\.[^/.]+$/, "");
        const isGlb = asset.r2_key.endsWith(".glb");
        const isUsdz = asset.r2_key.endsWith(".usdz");
        const isLargeFile = asset.size > SIZE_THRESHOLD;

        if (isGlb || isUsdz) {
          const companionExtension = isGlb ? "usdz" : "glb";
          const companionFileName = `${baseName}.${companionExtension}`;

          // Check if companion exists
          const companionExists = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM assets WHERE user_id = ? AND file_name = ?",
          )
            .bind(user.id, companionFileName)
            .first<{ count: number }>();

          if (!companionExists?.count) {
            suggestions.push({
              assetId: asset.r2_key,
              fileName: asset.file_name,
              baseName,
              fileType: isGlb ? "GLB" : "USDZ",
              companionType: isGlb ? "USDZ" : "GLB",
              companionFileName,
              fileSize: asset.size,
              fileSizeMB: Math.round(asset.size / 1024 / 1024),
              isLargeFile,
              uploadDate: asset.upload_date,
              priority: isLargeFile ? "high" : "medium",
              message: isLargeFile
                ? `Large ${isGlb ? "GLB" : "USDZ"} model (${Math.round(asset.size / 1024 / 1024)}MB). Upload companion ${companionExtension.toUpperCase()} for optimal AR/VR.`
                : `Upload companion ${companionExtension.toUpperCase()} file for enhanced cross-platform AR/VR support.`,
            });
          }
        }
      }

      return c.json({
        success: true,
        suggestions: suggestions.slice(0, 10), // Limit to 10 most recent
        totalSuggestions: suggestions.length,
      });
    } catch (error) {
      console.error("Companion suggestions error:", error);
      return c.json({ error: "Failed to get companion suggestions" }, 500);
    }
  });

  // GET /api/user/assets: List user assets with total size.
  app.get("/assets", async (c) => {
    const user = c.get("user");
    try {
      let query: string;
      let params: any[];

      if (user.is_admin) {
        // Admins can see all assets, with ownership info
        query = `
          SELECT 
            r2_key, 
            file_name, 
            file_type, 
            size, 
            upload_date,
            user_id,
            is_public,
            is_admin_upload,
            uploaded_by_admin,
            (SELECT username FROM users WHERE id = assets.user_id) as owner_username
          FROM assets 
          ORDER BY upload_date DESC
        `;
        params = [];
      } else {
        // Regular users can only see their own assets + public admin-shared assets
        query = `
          SELECT 
            r2_key, 
            file_name, 
            file_type, 
            size, 
            upload_date,
            user_id,
            is_public,
            is_admin_upload,
            uploaded_by_admin,
            (SELECT username FROM users WHERE id = assets.user_id) as owner_username
          FROM assets 
          WHERE user_id = ? OR (is_public = 1 AND is_admin_upload = 1)
          ORDER BY upload_date DESC
        `;
        params = [user.id];
      }

      const { results } = await c.env.DB.prepare(query)
        .bind(...params)
        .all();

      const files = ((results as unknown as AssetRow[]) || []).map(
        (asset: AssetRow) => ({
          name: asset.r2_key,
          url: `/model/${encodeURIComponent(asset.r2_key)}`,
          file_name: asset.file_name,
          file_type: asset.file_type,
          size: asset.size,
          uploaded: asset.upload_date,
          user_id: asset.user_id,
          is_public: asset.is_public === 1,
          is_admin_upload: asset.is_admin_upload === 1,
          uploaded_by_admin: asset.uploaded_by_admin,
          owner_username: asset.owner_username,
          is_owned_by_user: asset.user_id === user.id,
        }),
      );

      const totalSizeResult = await c.env.DB.prepare(
        "SELECT SUM(size) as total FROM assets WHERE user_id = ?",
      )
        .bind(user.id)
        .first<{ total: number }>();
      const totalSize = totalSizeResult?.total ?? 0;

      return c.json({ success: true, files, totalSize });
    } catch (e: unknown) {
      await logEvent(
        c.env,
        `Error listing user assets: ${(e as Error).message}`,
        "error",
      );
      return c.json({ error: "Failed to list user assets" }, 500);
    }
  });

  // GET /api/user/asset/signed-url?key=...
  // Returns a short-lived signed URL usable without Authorization header (e.g., iOS Quick Look)
  app.get("/asset/signed-url", async (c) => {
    try {
      const user = c.get("user");
      const url = new URL(c.req.url);
      const key = url.searchParams.get("key");
      if (!key) return c.json({ error: "Missing key" }, 400);

      // Check if user owns asset OR if it's a public admin-shared asset
      const assetAccess = await c.env.DB.prepare(
        "SELECT user_id, is_public, is_admin_upload FROM assets WHERE r2_key = ?",
      )
        .bind(key)
        .first<{
          user_id: number;
          is_public: number;
          is_admin_upload: number;
        }>();

      if (!assetAccess) {
        return c.json({ error: "Asset not found" }, 404);
      }

      // Allow access if user owns it OR if it's a public admin-shared asset
      const hasAccess =
        assetAccess.user_id === user.id ||
        (assetAccess.is_public === 1 && assetAccess.is_admin_upload === 1);

      if (!hasAccess) {
        return c.json({ error: "Access denied" }, 403);
      }

      const secret = new TextEncoder().encode((c.env.JWT_SECRET || "").trim());
      const token = await new SignJWT({ key })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("5m")
        .sign(secret);

      const origin = `${url.protocol}//${url.host}`;
      const signedUrl = `${origin}/model/${encodeURIComponent(key)}?t=${encodeURIComponent(
        token,
      )}`;

      await logEvent(c.env, "asset:signed-url", "debug", {
        user_id: user.id,
        username: user.username,
        asset_key: key,
      });

      return c.json({ url: signedUrl });
    } catch (e) {
      return c.json({ error: "Failed to create signed URL" }, 500);
    }
  });

  // PUT /api/user/content: Update user dashboard content
  app.put("/content", async (c) => {
    const user = c.get("user");
    try {
      const { content } = await c.req.json();

      await c.env.DB.prepare(
        "UPDATE users SET dashboard_content = ? WHERE id = ?",
      )
        .bind(content, user.id)
        .run();

      await logEvent(c.env, `User ${user.username} updated dashboard content`);
      return c.json({
        success: true,
        message: "Dashboard content updated successfully",
      });
    } catch (e: unknown) {
      await logEvent(
        c.env,
        `Error updating dashboard content: ${(e as Error).message}`,
        "error",
      );
      return c.json({ error: "Failed to update dashboard content" }, 500);
    }
  });

  // PUT /api/user/model-config: Save model configuration
  app.put("/model-config", async (c) => {
    const user = c.get("user");
    try {
      const { assetName, config } = await c.req.json();

      // For now, just log the config - in the future this could be stored in a separate table
      await logEvent(
        c.env,
        `User ${user.username} saved model config for ${assetName}: ${JSON.stringify(config)}`,
      );
      return c.json({ success: true, message: "Model configuration saved" });
    } catch (e: unknown) {
      await logEvent(
        c.env,
        `Error saving model config: ${(e as Error).message}`,
        "error",
      );
      return c.json({ error: "Failed to save model configuration" }, 500);
    }
  });

  // PUT /api/user/logo: Update user's logo URL
  app.put("/logo", async (c) => {
    const user = c.get("user");
    try {
      const { logoUrl } = await c.req.json();
      await c.env.DB.prepare("UPDATE users SET logo_url = ? WHERE id = ?")
        .bind(logoUrl, user.id)
        .run();
      await logEvent(c.env, `User ${user.username} updated logo`);
      return c.json({ success: true, logo_url: logoUrl });
    } catch (e: unknown) {
      await logEvent(
        c.env,
        `Error updating logo: ${(e as Error).message}`,
        "error",
      );
      return c.json({ error: "Failed to update logo" }, 500);
    }
  });

  // GET /api/user/shares: Get user's share history
  app.get("/shares", async (c) => {
    const user = c.get("user");
    try {
      const { results } = await c.env.DB.prepare(
        "SELECT id, dashboard_content, created_at, expires_at FROM shares WHERE user_id = ? ORDER BY created_at DESC",
      )
        .bind(user.id)
        .all();

      return c.json({
        success: true,
        shares: results || [],
      });
    } catch (e: unknown) {
      await logEvent(
        c.env,
        `Error fetching user shares: ${(e as Error).message}`,
        "error",
      );
      return c.json({ error: "Failed to fetch shares" }, 500);
    }
  });

  // Share endpoints
  app.post("/share", async (c) => {
    try {
      const user = c.get("user");
      const { description, title, background, expiresAt } = await c.req
        .json()
        .catch(() => ({}));

      const userRow = await c.env.DB.prepare(
        "SELECT username, dashboard_content, logo_url FROM users WHERE id = ?",
      )
        .bind(user.id)
        .first<{
          username: string;
          dashboard_content: string;
          logo_url: string | null;
        }>();
      if (!userRow) return c.json({ error: "User not found" }, 404);

      const shareId = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO shares (id, user_id, username, description, title, background, dashboard_content, logo_url, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          shareId,
          user.id,
          userRow.username,
          description || "",
          title || null,
          background || null,
          userRow.dashboard_content || "[]",
          userRow.logo_url || null,
          new Date().toISOString(),
          expiresAt || null,
        )
        .run();

      await logEvent(c.env, "share:created", "info", {
        user_id: user.id,
        username: user.username,
        share_id: shareId,
        has_expiry: !!expiresAt,
      });

      return c.json({ success: true, shareId });
    } catch (e: unknown) {
      await logEvent(c.env, "share:create:error", "error", {
        user_id: c.get("user")?.id,
        error: e instanceof Error ? e.message : String(e),
      });
      return c.json({ error: "Failed to create share link" }, 500);
    }
  });

  // DELETE /api/user/share/:id - Delete a share
  app.delete("/share/:id", async (c) => {
    try {
      const user = c.get("user");
      const shareId = c.req.param("id");

      // Verify ownership
      const share = await c.env.DB.prepare(
        "SELECT user_id FROM shares WHERE id = ?",
      )
        .bind(shareId)
        .first<{ user_id: number }>();

      if (!share) {
        return c.json({ error: "Share not found" }, 404);
      }

      if (share.user_id !== user.id) {
        return c.json({ error: "Unauthorized" }, 403);
      }

      // Delete the share
      await c.env.DB.prepare("DELETE FROM shares WHERE id = ?")
        .bind(shareId)
        .run();

      await logEvent(c.env, "share:deleted", "info", {
        user_id: user.id,
        username: user.username,
        share_id: shareId,
      });

      return c.json({ success: true, message: "Share deleted successfully" });
    } catch (e: unknown) {
      await logEvent(c.env, "share:delete:error", "error", {
        user_id: c.get("user")?.id,
        share_id: c.req.param("id"),
        error: e instanceof Error ? e.message : String(e),
      });
      return c.json({ error: "Failed to delete share" }, 500);
    }
  });
}
