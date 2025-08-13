// src/utils/upload.ts
// Base import for Hono types
import type { Context } from "hono";
import type { Env, Variables } from "../types";
import { logEvent } from "./log";
// Temporarily comment out unused imports to fix linting errors
/*
import {
  createErrorResponse,
  createSuccessResponse,
  AppError,
  withErrorHandler,
} from "./errors";
*/
import { getTotalStorageByUserId } from "./db";

// Type for context used across upload functions
type UploadContext = Context<{ Bindings: Env; Variables: Variables }>;

// Auto-link USDZ and GLB files with the same base name
export async function autoLinkUsdzFiles(
  c: UploadContext,
  uploadedKey: string,
  userId: number,
): Promise<void> {
  try {
    const baseName = uploadedKey.replace(/\.[^/.]+$/, ""); // Remove extension
    const isUsdz = uploadedKey.endsWith(".usdz");
    const isGlb = uploadedKey.endsWith(".glb");

    if (!isUsdz && !isGlb) {
      return; // Only link GLB and USDZ files
    }

    // Look for the companion file
    const companionKey = isUsdz ? `${baseName}.glb` : `${baseName}.usdz`;

    // Check if companion file exists for this user
    const companionAsset = await c.env.DB.prepare(
      "SELECT r2_key FROM assets WHERE r2_key = ? AND user_id = ?",
    )
      .bind(companionKey, userId)
      .first();

    if (companionAsset) {
      if (isUsdz) {
        // Link USDZ to existing GLB
        await c.env.DB.prepare(
          "UPDATE assets SET usdz_key = ? WHERE r2_key = ? AND user_id = ?",
        )
          .bind(uploadedKey, companionKey, userId)
          .run();

        console.log(`✓ Linked USDZ ${uploadedKey} to GLB ${companionKey}`);
      } else {
        // Link existing USDZ to this GLB
        await c.env.DB.prepare(
          "UPDATE assets SET usdz_key = ? WHERE r2_key = ? AND user_id = ?",
        )
          .bind(companionKey, uploadedKey, userId)
          .run();

        console.log(`✓ Linked GLB ${uploadedKey} to USDZ ${companionKey}`);
      }
    }
  } catch (error) {
    console.warn("Auto-link USDZ files warning:", error);
    // Don't throw error - this is a nice-to-have feature
  }
}

// Check and log if user should upload companion file
export async function checkAndNotifyCompanionFile(
  c: UploadContext,
  uploadedKey: string,
  fileName: string,
  fileSize: number,
  userId: number,
): Promise<void> {
  try {
    const baseName = uploadedKey.replace(/\.[^/.]+$/, ""); // Remove extension
    const isUsdz = uploadedKey.endsWith(".usdz");
    const isGlb = uploadedKey.endsWith(".glb");
    const SIZE_THRESHOLD = 100 * 1024 * 1024; // 100MB
    const isLargeFile = fileSize > SIZE_THRESHOLD;

    if (!isUsdz && !isGlb) {
      return; // Only check GLB and USDZ files
    }

    // Look for the companion file
    const companionKey = isUsdz ? `${baseName}.glb` : `${baseName}.usdz`;
    const companionType = isUsdz ? "GLB" : "USDZ";

    // Check if companion file exists for this user
    const companionAsset = await c.env.DB.prepare(
      "SELECT r2_key FROM assets WHERE r2_key = ? AND user_id = ?",
    )
      .bind(companionKey, userId)
      .first();

    if (!companionAsset) {
      // No companion file found - log a suggestion
      const fileTypeName = isUsdz ? "USDZ" : "GLB";
      let suggestionMessage = "";

      const baseNameForUser = fileName.replace(/\.[^/.]+$/, "");
      const companionFileName = `${baseNameForUser}.${companionType.toLowerCase()}`;

      if (isLargeFile) {
        suggestionMessage = `Large ${fileTypeName} file uploaded (${Math.round(fileSize / 1024 / 1024)}MB). Due to file size, automatic conversion may not work. Please upload a companion ${companionType} file named "${companionFileName}" for optimal cross-platform AR/VR support.`;
      } else {
        suggestionMessage = `${fileTypeName} file uploaded successfully. To ensure compatibility across all devices (iOS QuickLook + Android ARCore), please upload a companion ${companionType} file named "${companionFileName}".`;
      }

      await logEvent(c.env, "companion:file:suggestion", "info", {
        user_id: userId,
        // Only including valid LogEntry properties
      });

      console.log(
        `📁 Companion file suggestion for user ${userId}: ${suggestionMessage}`,
      );
    }
  } catch (error) {
    console.warn("Companion file check warning:", error);
    // Don't throw error - this is informational only
  }
}

// Supported file types with better validation
const FILE_TYPE_CONFIG = {
  model: {
    extensions: ["glb", "gltf", "usdz"],
    mimeTypes: [
      "model/gltf-binary",
      "model/gltf+json",
      "model/vnd.usdz+zip",
      "application/octet-stream",
    ],
    maxSize: 500 * 1024 * 1024, // 500MB
  },
  image: {
    extensions: ["png", "jpg", "jpeg", "svg", "webp"],
    mimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
    maxSize: 25 * 1024 * 1024, // 25MB
  },
  video: {
    extensions: ["mp4", "webm", "mov"],
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  document: {
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
} as const;

function getFileTypeFromExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if ((config.extensions as unknown as string[]).includes(ext)) {
      return type;
    }
  }

  return "document"; // Default fallback
}

function validateFile(
  filename: string,
  mimeType: string,
  size: number,
): { valid: boolean; error?: string } {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const fileType = getFileTypeFromExtension(filename);
  const config = FILE_TYPE_CONFIG[fileType as keyof typeof FILE_TYPE_CONFIG];

  if (!config) {
    return { valid: false, error: `Unsupported file extension: ${ext}` };
  }

  if (!(config.extensions as unknown as string[]).includes(ext)) {
    return { valid: false, error: `Invalid extension for ${fileType}: ${ext}` };
  }

  // More lenient mime type checking
  const normalizedMimeType = mimeType.toLowerCase();
  const isValidMimeType = config.mimeTypes.some(
    (allowed) =>
      normalizedMimeType.includes(allowed) ||
      allowed === "application/octet-stream",
  );

  if (!isValidMimeType && mimeType !== "application/octet-stream") {
    console.warn(
      `Mime type mismatch for ${filename}: expected one of ${config.mimeTypes.join(", ")}, got ${mimeType}`,
    );
  }

  if (size > config.maxSize) {
    return {
      valid: false,
      error: `File too large: ${(size / 1024 / 1024).toFixed(2)}MB exceeds ${(config.maxSize / 1024 / 1024).toFixed(0)}MB limit`,
    };
  }

  return { valid: true };
}

// Enhanced storage quota validation
async function _validateStorageQuota(
  c: UploadContext,
  userId: number,
  fileSize: number,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const maxStorageStr = c.env.MAX_STORAGE_SIZE || "1073741824"; // Default 1GB
    const maxStorage = parseInt(maxStorageStr, 10);

    const currentStorage = await getTotalStorageByUserId(c.env.DB, userId);
    const newTotal = currentStorage + fileSize;

    if (newTotal > maxStorage) {
      const currentMB = (currentStorage / 1024 / 1024).toFixed(2);
      const maxMB = (maxStorage / 1024 / 1024).toFixed(0);
      const fileMB = (fileSize / 1024 / 1024).toFixed(2);

      return {
        valid: false,
        error: `Storage quota exceeded. Current: ${currentMB}MB, File: ${fileMB}MB, Limit: ${maxMB}MB`,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Storage quota validation error:", error);
    return { valid: false, error: "Failed to validate storage quota" };
  }
}

// Optimized file upload handler with better error handling
export async function handleFileUpload(
  c: UploadContext,
  _adminUpload = false,
): Promise<Response> {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file
    const validation = validateFile(
      file.name,
      file.type || "application/octet-stream",
      file.size,
    );
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    const user = c.get("user");
    const overrideUserIdStr = formData.get("userId") as string | null;
    const targetUserId = overrideUserIdStr
      ? parseInt(overrideUserIdStr, 10)
      : user.id;
    const fileType = getFileTypeFromExtension(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    // Admin controls
    const isPublic = formData.get("isPublic") === "true";
    const isAdminUploading = user.is_admin;
    const uploadedByAdmin = isAdminUploading ? user.id : null;

    // Check user upload limits (only for model files and non-admin uploads)
    if (!_adminUpload && fileType === "model" && !isAdminUploading) {
      const userRow = await c.env.DB.prepare(
        "SELECT max_models FROM users WHERE id = ?",
      )
        .bind(targetUserId)
        .first<{ max_models: number }>();

      if (!userRow) {
        return c.json({ error: "User not found" }, 404);
      }

      // Count user's own models only (not public admin-shared models)
      const currentModelCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM assets WHERE user_id = ? AND file_type = 'model' AND is_admin_upload = 0",
      )
        .bind(targetUserId)
        .first<{ count: number }>();

      if ((currentModelCount?.count || 0) >= userRow.max_models) {
        return c.json(
          {
            error: `Upload limit reached. Maximum ${userRow.max_models} models allowed.`,
            currentCount: currentModelCount?.count || 0,
            maxModels: userRow.max_models,
            note: "Shared admin models don't count towards your limit",
          },
          400,
        );
      }
    }

    // Generate unique key with better organization
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const key = `${fileType}/${timestamp}_${uuid}.${ext}`;

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to R2 with metadata
    await c.env.ASSETS.put(key, uint8Array, {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        originalName: file.name,
        uploadedBy: String(targetUserId),
        uploadedAt: new Date().toISOString(),
        isAdminUpload: String(_adminUpload),
      },
    });

    // Store in database with better error handling
    try {
      await c.env.DB.prepare(
        `INSERT INTO assets (user_id, r2_key, file_name, file_type, size, upload_date, is_public, is_admin_upload, uploaded_by_admin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          targetUserId,
          key,
          file.name,
          fileType,
          file.size,
          new Date().toISOString(),
          isPublic ? 1 : 0,
          isAdminUploading ? 1 : 0,
          uploadedByAdmin,
        )
        .run();

      // Auto-link USDZ files after successful upload
      await autoLinkUsdzFiles(c, key, targetUserId);

      // Check if user should be notified about companion file upload
      await checkAndNotifyCompanionFile(
        c,
        key,
        file.name,
        file.size,
        targetUserId,
      );
    } catch (dbError) {
      // Rollback R2 upload if DB insert fails
      await c.env.ASSETS.delete(key);
      throw new Error(`Database error: ${dbError}`);
    }

    // Log successful upload
    await logEvent(c.env, "asset:upload", "info", {
      user_id: targetUserId,
      username: user.username,
      file_name: file.name,
      file_type: fileType,
      size: file.size,
      asset_key: key,
      // admin_upload: adminUpload,  // Commenting out non-existent LogEntry property
    });

    return c.json({
      success: true,
      message: "File uploaded successfully",
      url: `/model/${encodeURIComponent(key)}`,
      asset_key: key,
      fileType,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    await logEvent(c.env, "asset:upload:error", "error", {
      error: error instanceof Error ? error.message : String(error),
      user_id: c.get("user")?.id,
    });
    return c.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}

// Enhanced presigned URL handler with validation
export async function handleGetPresignedUrl(
  c: UploadContext,
  _adminUpload = false,
): Promise<Response> {
  try {
    const { fileName, fileType } = await c.req.json<{
      fileName: string;
      fileType: string;
    }>();

    if (!fileName || !fileType) {
      return c.json({ error: "fileName and fileType are required" }, 400);
    }

    // Validate file before generating presigned URL
    const validation = validateFile(fileName, fileType, 0); // Size will be checked on completion
    if (!validation.valid && !validation.error?.includes("File too large")) {
      return c.json({ error: validation.error }, 400);
    }

    const user = c.get("user");
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const assetType = getFileTypeFromExtension(fileName);

    // Generate organized key
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const key = `${assetType}/${timestamp}_${uuid}.${ext}`;

    // Create multipart upload with metadata
    const multipartUpload = await c.env.ASSETS.createMultipartUpload(key, {
      httpMetadata: {
        contentType: fileType,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        originalName: fileName,
        uploadedBy: String(user.id),
        uploadedAt: new Date().toISOString(),
        isAdminUpload: String(_adminUpload),
        status: "pending",
      },
    });

    await logEvent(c.env, "presigned:created", "info", {
      user_id: user.id,
      username: user.username,
      file_name: fileName,
      asset_key: key,
    });

    return c.json({
      success: true,
      uploadId: multipartUpload.uploadId,
      key: multipartUpload.key,
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    await logEvent(c.env, "presigned:error", "error", {
      error: error instanceof Error ? error.message : String(error),
      user_id: c.get("user")?.id,
    });
    return c.json({ error: "Failed to create presigned upload URL" }, 500);
  }
}

// Enhanced upload completion handler
export async function handleAssetUploadComplete(
  c: UploadContext,
  _adminUpload = false,
): Promise<Response> {
  try {
    const { key, uploadId, parts, fileName, fileSize } = await c.req.json<{
      key: string;
      uploadId: string;
      parts: Array<{ partNumber: number; etag: string }>;
      fileName?: string;
      fileSize?: number;
    }>();

    if (!key || !uploadId || !parts || parts.length === 0) {
      return c.json({ error: "Invalid upload completion request" }, 400);
    }

    const user = c.get("user");

    // Admin controls for multipart upload
    const isPublic = c.req.query("isPublic") === "true";
    const isAdminUploading = user.is_admin;
    const uploadedByAdmin = isAdminUploading ? user.id : null;

    // Complete the multipart upload
    const multipartUpload = c.env.ASSETS.resumeMultipartUpload(key, uploadId);
    const _object = await multipartUpload.complete(parts);

    // Get actual file info
    const r2Object = await c.env.ASSETS.head(key);
    const actualSize = r2Object?.size || fileSize || 0;
    const actualFileName =
      fileName ||
      r2Object?.customMetadata?.originalName ||
      key.split("/").pop() ||
      key;

    // Validate completed file size
    const fileType = getFileTypeFromExtension(actualFileName);
    const config = FILE_TYPE_CONFIG[fileType as keyof typeof FILE_TYPE_CONFIG];
    if (config && actualSize > config.maxSize) {
      // Delete the uploaded file if it exceeds size limit
      await c.env.ASSETS.delete(key);
      return c.json(
        {
          error: `File too large: ${(actualSize / 1024 / 1024).toFixed(2)}MB exceeds ${(config.maxSize / 1024 / 1024).toFixed(0)}MB limit`,
        },
        400,
      );
    }

    // Update metadata to mark as completed
    if (r2Object) {
      await c.env.ASSETS.put(key, r2Object.body, {
        httpMetadata: r2Object.httpMetadata,
        customMetadata: {
          ...r2Object.customMetadata,
          status: "completed",
          completedAt: new Date().toISOString(),
        },
      });
    }

    // Store in database
    await c.env.DB.prepare(
      `INSERT INTO assets (user_id, r2_key, file_name, file_type, size, upload_date, is_public, is_admin_upload, uploaded_by_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        user.id,
        key,
        actualFileName,
        fileType,
        actualSize,
        new Date().toISOString(),
        isPublic ? 1 : 0,
        isAdminUploading ? 1 : 0,
        uploadedByAdmin,
      )
      .run();

    // Return authenticated route URL
    const url = `/model/${encodeURIComponent(key)}`;

    await logEvent(c.env, "asset:upload:complete", "info", {
      user_id: user.id,
      username: user.username,
      file_name: actualFileName,
      file_type: fileType,
      size: actualSize,
      asset_key: key,
      // admin_upload: adminUpload,  // Commenting out non-existent LogEntry property
    });

    return c.json({
      success: true,
      message: "Upload completed successfully",
      url,
      asset_key: key,
      fileName: actualFileName,
      fileType,
      size: actualSize,
    });
  } catch (error) {
    console.error("Upload completion error:", error);
    await logEvent(c.env, "asset:upload:complete:error", "error", {
      error: error instanceof Error ? error.message : String(error),
      user_id: c.get("user")?.id,
    });
    return c.json({ error: "Failed to complete upload" }, 500);
  }
}

// Cleanup incomplete uploads (can be called periodically)
export async function cleanupIncompleteUploads(env: Env): Promise<void> {
  try {
    const list = await env.ASSETS.list();
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    for (const object of list.objects) {
      const metadata = object.customMetadata;
      if (metadata?.status === "pending") {
        const uploadedAt = new Date(metadata.uploadedAt || 0).getTime();
        if (now - uploadedAt > ONE_DAY) {
          // Delete stale incomplete uploads
          await env.ASSETS.delete(object.key);
          await logEvent(env, "cleanup:incomplete-upload", "info", {
            // object_key: object.key,  // Removed non-existent LogEntry property
            // uploaded_at: metadata.uploadedAt,  // Removed non-existent LogEntry property
          });
        }
      }
    }
  } catch (error) {
    await logEvent(env, "cleanup:error", "error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
