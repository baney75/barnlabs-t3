/* eslint-disable @typescript-eslint/no-unused-vars */
// src/routes/admin.ts
import { Hono } from "hono";
import { handleFileUpload } from "../utils/upload";
import { logEvent, getLogs } from "../utils/log";
import { adminAuth, verifyToken } from "../middleware/auth";
import { hashPassword } from "../utils/auth";
import {
  getAllUsers,
  deleteUser,
  createUser,
  updateUser,
  cleanupOrphanedData,
  initializeDatabase,
} from "../utils/db";
import type { Env, Variables, User, CreateUserRequest } from "../types";
import {
  handleGetPresignedUrl,
  handleAssetUploadComplete,
  autoLinkUsdzFiles,
  checkAndNotifyCompanionFile,
} from "../utils/upload";

export function addAdminRoutes(
  app: Hono<{ Bindings: Env; Variables: Variables }>,
) {
  async function convertGlbToUsdz(
    c: { env: Env; executionCtx: { waitUntil: (p: Promise<any>) => void } },
    key: string,
    ownerUserId: number,
  ) {
    try {
      const convUrl = (c.env as unknown as { CONVERTER_URL?: string })
        .CONVERTER_URL;
      if (!convUrl) return; // converter not configured

      // Fetch GLB from R2
      const obj = await c.env.ASSETS.get(key);
      if (!obj) return;
      const contentType = obj.httpMetadata?.contentType || "model/gltf-binary";

      // Call external converter (expects raw GLB, returns USDZ bytes)
      const headers: Record<string, string> = { "Content-Type": contentType };
      const token = (c.env as unknown as { CONVERTER_API_KEY?: string })
        .CONVERTER_API_KEY;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(convUrl, {
        method: "POST",
        headers,
        body: obj.body as any,
      });
      if (!resp.ok) {
        console.warn("USDZ conversion failed:", resp.status);
        return;
      }
      const usdzBuffer = await resp.arrayBuffer();

      // Store USDZ in R2 and link
      const usdzKey = `usdz/${Date.now()}_${crypto.randomUUID()}.usdz`;
      await c.env.ASSETS.put(usdzKey, usdzBuffer, {
        httpMetadata: {
          contentType: "model/vnd.usdz+zip",
          cacheControl: "public, max-age=31536000, immutable",
        },
        customMetadata: { source: key, uploadedBy: String(ownerUserId) },
      });

      await c.env.DB.prepare("UPDATE assets SET usdz_key = ? WHERE r2_key = ?")
        .bind(usdzKey, key)
        .run();
    } catch (e) {
      console.error("convertGlbToUsdz error:", (e as Error).message);
    }
  }
  // Apply authentication middleware
  app.use("*", verifyToken);
  app.use("*", adminAuth);

  // NOTE: Main /stats endpoint is defined later in the file with proper KV logging support

  // --- System Health Check ---
  app.get("/health", async (c) => {
    try {
      // Check database
      const dbTest = await c.env.DB.prepare("SELECT 1")
        .first()
        .catch(() => null);
      const dbHealthy = !!dbTest;

      // Check storage
      let storageHealthy = true;
      try {
        await c.env.ASSETS.head("test-connection");
      } catch (e) {
        // Expected to fail if file doesn't exist, but connection works
        storageHealthy = true;
      }

      // Simple API health (we're responding, so it's healthy)
      const apiHealthy = true;

      return c.json({
        database: dbHealthy ? "healthy" : "error",
        storage: storageHealthy ? "healthy" : "error",
        api: apiHealthy ? "healthy" : "error",
        lastCheck: new Date().toISOString(),
      });
    } catch (error) {
      return c.json(
        {
          database: "error",
          storage: "error",
          api: "error",
          lastCheck: new Date().toISOString(),
        },
        500,
      );
    }
  });

  // --- Asset Management ---
  app.post("/upload", (c) => handleFileUpload(c, true));

  // Presigned upload for admin (preferred for large files)
  app.post("/asset/presigned-upload-url", (c) =>
    handleGetPresignedUrl(c, true),
  );
  app.post("/asset/upload-complete", (c) => handleAssetUploadComplete(c, true));

  // USDZ linking removed: AR uses GLB with ARCore/WebXR only

  // --- Multipart Upload (large files) ---
  // POST /api/admin/mpu/create - begin multipart upload, returns { key, uploadId }
  app.post("/mpu/create", async (c) => {
    try {
      const user = c.get("user");
      const { fileName, mimeType, ownerUserId } = await c.req.json<{
        fileName: string;
        mimeType: string;
        ownerUserId?: number;
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
        customMetadata: {
          uploadedBy: String(ownerUserId ?? user.id),
          originalName: fileName,
        },
      });

      return c.json({ key: mpu.key, uploadId: mpu.uploadId });
    } catch (error) {
      console.error("mpu-create error:", error);
      return c.json({ error: "Failed to create multipart upload" }, 500);
    }
  });

  // PUT /api/admin/mpu/uploadpart?key=...&uploadId=...&partNumber=...
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
      return c.json(uploadedPart);
    } catch (error) {
      console.error("mpu-uploadpart error:", error);
      return c.json({ error: "Failed to upload part" }, 400);
    }
  });

  // POST /api/admin/mpu/complete - body: { key, uploadId, parts, originalName, size }
  app.post("/mpu/complete", async (c) => {
    try {
      const user = c.get("user");
      const {
        key,
        uploadId,
        parts,
        originalName,
        size,
        ownerUserId,
        isPublic,
        increaseUserLimit,
      } = await c.req.json<{
        key: string;
        uploadId: string;
        parts: { partNumber: number; etag: string }[];
        originalName?: string;
        size?: number;
        ownerUserId?: number;
        isPublic?: boolean;
        increaseUserLimit?: boolean;
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

      const isAdminUpload = user.is_admin ? 1 : 0;
      const isPublicValue = isPublic ? 1 : 0;
      const uploadedByAdmin = user.is_admin ? user.id : null;

      await c.env.DB.prepare(
        `INSERT INTO assets (user_id, r2_key, file_name, file_type, size, upload_date, is_public, is_admin_upload, uploaded_by_admin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          ownerUserId ?? user.id,
          key,
          nameForDb,
          fileType,
          objectSize,
          new Date().toISOString(),
          isPublicValue,
          isAdminUpload,
          uploadedByAdmin,
        )
        .run();

      // Increase user model limit if requested and model is being shared
      if (increaseUserLimit && isPublic && ownerUserId && user.is_admin) {
        try {
          await c.env.DB.prepare(
            "UPDATE users SET max_models = max_models + 1 WHERE id = ?",
          )
            .bind(ownerUserId)
            .run();
        } catch (limitError) {
          console.warn("Failed to increase user model limit:", limitError);
        }
      }

      // Auto-link USDZ files after successful upload
      try {
        await autoLinkUsdzFiles(c, key, ownerUserId ?? user.id);
      } catch (linkError) {
        console.warn("Auto-linking failed:", linkError);
      }

      // Check if user should be notified about companion file upload
      try {
        await checkAndNotifyCompanionFile(
          c,
          key,
          nameForDb,
          objectSize,
          ownerUserId ?? user.id,
        );
      } catch (notifyError) {
        console.warn("Companion file notification failed:", notifyError);
      }

      // Fire-and-forget USDZ conversion for iOS Quick Look if GLB
      try {
        if (fileType === "model" && key.toLowerCase().endsWith(".glb")) {
          const ownerId = ownerUserId ?? user.id;
          c.executionCtx.waitUntil(
            convertGlbToUsdz(
              c as unknown as {
                env: Env;
                executionCtx: { waitUntil: (p: Promise<any>) => void };
              },
              key,
              ownerId,
            ),
          );
        }
      } catch {}

      return c.json({
        success: true,
        key,
        url: `/model/${encodeURIComponent(key)}`,
      });
    } catch (error) {
      console.error("mpu-complete error:", error);
      return c.json({ error: "Failed to complete multipart upload" }, 400);
    }
  });

  // DELETE /api/admin/mpu/abort?key=...&uploadId=...
  app.delete("/mpu/abort", async (c) => {
    try {
      const url = new URL(c.req.url);
      const key = url.searchParams.get("key");
      const uploadId = url.searchParams.get("uploadId");
      if (!key || !uploadId)
        return c.json({ error: "Missing key or uploadId" }, 400);
      const mpu = c.env.ASSETS.resumeMultipartUpload(key, uploadId);
      await mpu.abort();
      return c.json({ success: true });
    } catch (error) {
      console.error("mpu-abort error:", error);
      return c.json({ error: "Failed to abort multipart upload" }, 400);
    }
  });

  // GET /api/admin/assets - List all assets with total size
  app.get("/assets", async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        "SELECT r2_key, file_name, file_type, size, upload_date FROM assets ORDER BY upload_date DESC",
      ).all();
      const files = (results || []).map((row: Record<string, unknown>) => ({
        name: row.r2_key as string,
        url: `/model/${encodeURIComponent(row.r2_key as string)}`,
        file_name: row.file_name as string,
        file_type: row.file_type as string,
        size: row.size as number,
        uploaded: row.upload_date as string,
      }));
      const totalSizeRow = await c.env.DB.prepare(
        "SELECT SUM(size) as total FROM assets",
      ).first<{ total: number }>();
      return c.json({
        success: true,
        files,
        totalSize: totalSizeRow?.total ?? 0,
      });
    } catch (error) {
      console.error("Failed to list assets:", error);
      return c.json({ error: "Failed to list assets" }, 500);
    }
  });

  // GET /api/admin/sync-assets - Import missing R2 objects into D1
  app.get("/sync-assets", async (c) => {
    try {
      let cursor: string | undefined = undefined;
      let imported = 0;
      let skipped = 0;
      const adminUserId = c.get("user").id;

      do {
        const list: Awaited<ReturnType<typeof c.env.ASSETS.list>> =
          await c.env.ASSETS.list({ cursor });
        for (const obj of list.objects) {
          const exists = await c.env.DB.prepare(
            "SELECT 1 FROM assets WHERE r2_key = ?",
          )
            .bind(obj.key)
            .first();
          if (exists) {
            skipped += 1;
            continue;
          }
          const ext = (obj.key.split(".").pop() || "").toLowerCase();
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
          const head = await c.env.ASSETS.head(obj.key);
          const originalName =
            head?.customMetadata?.originalName ||
            obj.key.split("/").pop() ||
            obj.key;
          const uploadedByStr = head?.customMetadata?.uploadedBy;
          const ownerId = uploadedByStr ? parseInt(uploadedByStr) : adminUserId;
          const size = (head as unknown as { size?: number } | null)?.size ?? 0;
          await c.env.DB.prepare(
            `INSERT INTO assets (user_id, r2_key, file_name, file_type, size, upload_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
            .bind(
              ownerId,
              obj.key,
              originalName,
              fileType,
              size,
              new Date().toISOString(),
            )
            .run();
          imported += 1;
        }
        const next = (list as unknown as { cursor?: string }).cursor;
        cursor = list.truncated ? next : undefined;
      } while (cursor);

      return c.json({
        success: true,
        message: "Sync completed",
        imported,
        skipped,
      });
    } catch (error) {
      console.error("Sync error:", error);
      return c.json({ error: "Failed to sync assets" }, 500);
    }
  });

  // --- Settings: Overview/status of environment & bindings ---
  app.get("/settings/status", async (c) => {
    try {
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID || null;
      const scriptName = (c.env as any).SCRIPT_NAME || "barn-labs-landing-page";
      const hasCLOUDFLARE_TOKEN = !!(c.env as any).CLOUDFLARE_TOKEN;
      const hasJWT_SECRET = !!(c.env as any).JWT_SECRET;
      const hasASSETSBinding = !!(c.env as any).ASSETS;
      const hasDB = !!(c.env as any).DB;
      const hasLOGS = !!(c.env as any).LOGS;
      const url = new URL(c.req.url);
      return c.json({
        success: true,
        accountId,
        scriptName,
        origin: `${url.protocol}//${url.host}`,
        hasCLOUDFLARE_TOKEN,
        hasJWT_SECRET,
        hasASSETSBinding,
        hasDB,
        hasLOGS,
      });
    } catch (_err) {
      return c.json({ error: "Failed to read status" }, 500);
    }
  });

  // --- Settings: Cloudflare overview using stored token ---
  app.get("/settings/cf/overview", async (c) => {
    try {
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const scriptName = (c.env as any).SCRIPT_NAME || "barn-labs-landing-page";
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId) return c.json({ error: "Missing account id" }, 500);
      if (!bearer)
        return c.json({ error: "Missing CLOUDFLARE_TOKEN secret" }, 400);

      const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;

      const [workersRes, r2Res, d1Res, kvRes] = await Promise.all([
        fetch(`${base}/workers/scripts?per_page=50`, { headers }),
        fetch(`${base}/r2/buckets`, { headers }),
        fetch(`${base}/d1/database?page=1&per_page=50`, { headers }),
        fetch(`${base}/storage/kv/namespaces`, { headers }),
      ]);

      const okAll = workersRes.ok && r2Res.ok && d1Res.ok && kvRes.ok;
      const [workers, r2, d1, kv] = okAll
        ? await Promise.all([
            workersRes.json(),
            r2Res.json(),
            d1Res.json(),
            kvRes.json(),
          ])
        : [null, null, null, null];

      return c.json({
        success: okAll,
        scriptName,
        workers: workers?.result || [],
        r2Buckets: r2?.result || [],
        d1Databases: d1?.result || [],
        kvNamespaces: kv?.result || [],
      });
    } catch (_err) {
      return c.json({ error: "Failed to fetch Cloudflare overview" }, 500);
    }
  });

  // --- Enhanced Cloudflare API endpoints leveraging all permissions ---

  // Get comprehensive account analytics
  app.get("/settings/cf/analytics", async (c) => {
    try {
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;
      const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;

      // Fetch account analytics (Account Analytics:Read)
      const analyticsRes = await fetch(
        `${base}/analytics/aggregate?since=2024-01-01`,
        { headers },
      );
      const analytics = analyticsRes.ok ? await analyticsRes.json() : null;

      // Fetch audit logs (Access: Audit Logs:Read)
      const auditRes = await fetch(`${base}/audit_logs?per_page=20`, {
        headers,
      });
      const auditLogs = auditRes.ok ? await auditRes.json() : null;

      return c.json({
        success: analyticsRes.ok && auditRes.ok,
        analytics: analytics?.result || {},
        auditLogs: auditLogs?.result || [],
      });
    } catch (_err) {
      return c.json({ error: "Failed to fetch analytics" }, 500);
    }
  });

  // Workers AI management (Workers AI:Edit)
  app.get("/settings/cf/workers-ai", async (c) => {
    try {
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;

      // Get AI models catalog
      const modelsRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`,
        { headers },
      );
      const models = modelsRes.ok ? await modelsRes.json() : null;

      return c.json({
        success: modelsRes.ok,
        models: models?.result || [],
      });
    } catch (_err) {
      return c.json({ error: "Failed to fetch AI models" }, 500);
    }
  });

  // R2 Storage management with Data Catalog (Workers R2 Storage:Edit, Workers R2 Data Catalog:Edit)
  app.get("/settings/cf/r2/:bucket", async (c) => {
    try {
      const bucket = c.req.param("bucket");
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;
      const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;

      // Get bucket details
      const bucketRes = await fetch(`${base}/r2/buckets/${bucket}`, {
        headers,
      });
      const bucketInfo = bucketRes.ok ? await bucketRes.json() : null;

      // Get bucket usage
      const usageRes = await fetch(`${base}/r2/buckets/${bucket}/usage`, {
        headers,
      });
      const usage = usageRes.ok ? await usageRes.json() : null;

      return c.json({
        success: bucketRes.ok,
        bucket: bucketInfo?.result || {},
        usage: usage?.result || {},
      });
    } catch (_err) {
      return c.json({ error: "Failed to fetch R2 bucket details" }, 500);
    }
  });

  // Configure R2 bucket CORS (Workers R2 Storage:Edit)
  app.put("/settings/cf/r2/:bucket/cors", async (c) => {
    try {
      const bucket = c.req.param("bucket");
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const corsRules = await c.req.json();
      const headers = {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      } as Record<string, string>;

      // Default CORS for AR/VR support
      const defaultCors = corsRules || [
        {
          allowedOrigins: ["*"],
          allowedMethods: ["GET", "HEAD", "PUT", "POST"],
          allowedHeaders: ["*"],
          exposeHeaders: ["ETag"],
          maxAgeSeconds: 3600,
        },
      ];

      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/cors`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(defaultCors),
        },
      );

      if (!res.ok) {
        const error = await res.text();
        return c.json({ error: `Failed to update CORS: ${error}` }, 400);
      }

      return c.json({ success: true, message: "CORS rules updated" });
    } catch (_err) {
      return c.json({ error: "Failed to update CORS" }, 500);
    }
  });

  // D1 Database operations (D1:Edit)
  app.get("/settings/cf/d1/:database/query", async (c) => {
    try {
      const database = c.req.param("database");
      const query = c.req.query("sql");
      if (!query) return c.json({ error: "Missing SQL query" }, 400);

      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      } as Record<string, string>;

      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${database}/query`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ sql: query }),
        },
      );

      const result = await res.json();
      return c.json({
        success: res.ok,
        result: result.result || result.errors || result,
      });
    } catch (_err) {
      return c.json({ error: "Query failed" }, 500);
    }
  });

  // Workers KV operations (Workers KV Storage:Edit)
  app.get("/settings/cf/kv/:namespace/keys", async (c) => {
    try {
      const namespace = c.req.param("namespace");
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespace}/keys`,
        { headers },
      );

      const data = await res.json();
      return c.json({
        success: res.ok,
        keys: data.result || [],
      });
    } catch (_err) {
      return c.json({ error: "Failed to list KV keys" }, 500);
    }
  });

  // Pages deployment management (Cloudflare Pages:Edit)
  app.get("/settings/cf/pages", async (c) => {
    try {
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
        { headers },
      );

      const data = await res.json();
      return c.json({
        success: res.ok,
        projects: data.result || [],
      });
    } catch (_err) {
      return c.json({ error: "Failed to fetch Pages projects" }, 500);
    }
  });

  // Workers observability and logs (Workers Observability:Edit, Logs:Edit, Workers Tail:Read)
  app.get("/settings/cf/workers/:script/logs", async (c) => {
    try {
      const script = c.req.param("script");
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;

      // Get script analytics
      const analyticsRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/analytics/stored?filters=scriptName==${script}&limit=100`,
        { headers },
      );

      const analytics = analyticsRes.ok ? await analyticsRes.json() : null;

      return c.json({
        success: analyticsRes.ok,
        analytics: analytics?.result || [],
      });
    } catch (_err) {
      return c.json({ error: "Failed to fetch worker logs" }, 500);
    }
  });

  // Comprehensive account settings (Account Settings:Edit)
  app.get("/settings/cf/account", async (c) => {
    try {
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;

      // Get account details
      const accountRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}`,
        { headers },
      );

      // Get account members (User Details:Edit)
      const membersRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/members`,
        { headers },
      );

      const account = accountRes.ok ? await accountRes.json() : null;
      const members = membersRes.ok ? await membersRes.json() : null;

      return c.json({
        success: accountRes.ok,
        account: account?.result || {},
        members: members?.result || [],
      });
    } catch (_err) {
      return c.json({ error: "Failed to fetch account details" }, 500);
    }
  });

  // Manual admin-triggered USDZ conversion for a GLB key
  app.post("/convert-usdz", async (c) => {
    try {
      const url = new URL(c.req.url);
      const key = url.searchParams.get("key");
      if (!key) return c.json({ error: "Missing key" }, 400);
      const user = c.get("user");
      await convertGlbToUsdz(c, key, user.id);
      return c.json({ success: true });
    } catch (e) {
      return c.json({ error: "Conversion failed" }, 500);
    }
  });

  // AI Gateway management (AI Gateway:Edit)
  app.get("/settings/cf/ai-gateway", async (c) => {
    try {
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      if (!accountId || !bearer)
        return c.json({ error: "Missing credentials" }, 400);

      const headers = { Authorization: `Bearer ${bearer}` } as Record<
        string,
        string
      >;
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-gateway/gateways`,
        { headers },
      );

      const data = await res.json();
      return c.json({
        success: res.ok,
        gateways: data.result || [],
      });
    } catch (_err) {
      return c.json({ error: "Failed to fetch AI gateways" }, 500);
    }
  });

  // --- Settings: Update Cloudflare Worker secrets (generic) ---
  app.put("/settings/secrets", async (c) => {
    try {
      const body = (await c.req.json().catch(() => ({}))) as Record<
        string,
        string
      >;
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;
      const scriptName = (c.env as any).SCRIPT_NAME || "barn-labs-landing-page";
      const bearer = (c.env as any).CLOUDFLARE_TOKEN || body.CLOUDFLARE_TOKEN;
      if (!accountId) return c.json({ error: "Missing account id" }, 500);
      if (!bearer)
        return c.json(
          {
            error:
              "CLOUDFLARE_TOKEN secret not set; provide in body or set secret first",
          },
          400,
        );

      const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/secrets`;
      const headers = {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      } as Record<string, string>;

      const updates: Array<{ name: string; text: string }> = [];
      for (const [k, v] of Object.entries(body)) {
        if (!v) continue;
        if (
          k === "CLOUDFLARE_TOKEN" ||
          k === "JWT_SECRET" ||
          k === "FEATURED_ASSET_KEY"
        ) {
          updates.push({ name: k, text: v });
        }
      }
      if (updates.length === 0)
        return c.json({ error: "No supported secrets provided" }, 400);

      for (const u of updates) {
        const res = await fetch(apiUrl, {
          method: "PUT",
          headers,
          body: JSON.stringify(u),
        });
        if (!res.ok) {
          const msg = await res.text();
          return c.json({ error: `Failed to set ${u.name}: ${msg}` }, 502);
        }
      }
      return c.json({ success: true, updated: updates.map((u) => u.name) });
    } catch (_err) {
      return c.json({ error: "Failed to update secrets" }, 500);
    }
  });

  // Enhanced admin stats with Cloudflare integration
  app.get("/stats", async (c) => {
    try {
      console.log("🔍 Admin stats request started");

      // Get user stats using improved database functions
      const userCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM users",
      ).first<{ count: number }>();

      console.log("👥 User count result:", userCount);

      // Get asset stats with type breakdown
      const assetStats = await c.env.DB.prepare(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN file_type = 'model' THEN 1 ELSE 0 END) as models,
          SUM(CASE WHEN file_type = 'image' THEN 1 ELSE 0 END) as images,
          SUM(CASE WHEN file_type = 'video' THEN 1 ELSE 0 END) as videos,
          SUM(CASE WHEN file_type = 'document' OR file_type = 'pdf' THEN 1 ELSE 0 END) as documents,
          SUM(size) as totalSize,
          SUM(CASE WHEN file_type = 'model' THEN size ELSE 0 END) as modelSize,
          SUM(CASE WHEN file_type = 'image' THEN size ELSE 0 END) as imageSize,
          SUM(CASE WHEN file_type = 'video' THEN size ELSE 0 END) as videoSize,
          SUM(CASE WHEN file_type = 'document' OR file_type = 'pdf' THEN size ELSE 0 END) as documentSize
        FROM assets
      `,
      ).first();

      console.log("📦 Asset stats result:", assetStats);

      // Get share stats
      const shareStats = await c.env.DB.prepare(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN expires_at IS NULL OR expires_at > datetime('now') THEN 1 ELSE 0 END) as active
        FROM shares
      `,
      ).first<{ total: number; active: number }>();

      console.log("🔗 Share stats result:", shareStats);

      // Get recent activity from KV logs (since we use KV for logging, not DB)
      const recentActivity = [];
      try {
        const logsList = await c.env.LOGS.list({ limit: 50 });
        const logPromises = logsList.keys.slice(0, 20).map(async (key: any) => {
          try {
            const logData = await c.env.LOGS.get(key.name);
            return logData ? JSON.parse(logData) : null;
          } catch {
            return null;
          }
        });

        const logs = (await Promise.all(logPromises))
          .filter(
            (log: any) =>
              log &&
              (log.message?.includes("upload") ||
                log.message?.includes("share") ||
                log.message?.includes("user") ||
                log.message?.includes("delete")),
          )
          .slice(0, 10); // Limit to 10 recent activities

        recentActivity.push(
          ...logs.map((log: any) => {
            let type: "upload" | "share" | "user" | "delete" = "upload";
            let message = log.message || "Unknown activity";

            if (message.includes("upload") || message.includes("Upload")) {
              type = "upload";
              message = `Uploaded ${log.file_name || "file"}`;
            } else if (message.includes("share") || message.includes("Share")) {
              type = "share";
              message = "Created share link";
            } else if (message.includes("user") || message.includes("User")) {
              type = "user";
              message = "New user registered";
            } else if (
              message.includes("delete") ||
              message.includes("Delete")
            ) {
              type = "delete";
              message = `Deleted ${log.file_name || "asset"}`;
            }

            return {
              id: log.request_id || Date.now().toString(),
              type,
              message,
              timestamp: log.timestamp || new Date().toISOString(),
              user: log.username || "Unknown user",
            };
          }),
        );
      } catch (error) {
        console.warn("Could not fetch recent activity from logs:", error);
        // Add some default activity if logs are not available
        recentActivity.push({
          id: "default-1",
          type: "user" as const,
          message: "System initialized",
          timestamp: new Date().toISOString(),
          user: "System",
        });
      }

      // Get growth data (last 7 days)
      const userGrowth = await c.env.DB.prepare(
        `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM users
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      ).all();

      const assetGrowth = await c.env.DB.prepare(
        `
        SELECT 
          DATE(upload_date) as date,
          COUNT(*) as count
        FROM assets
        WHERE upload_date >= datetime('now', '-7 days')
        GROUP BY DATE(upload_date)
        ORDER BY date
      `,
      ).all();

      // Try to get Cloudflare stats if token is available
      let cloudflareStats = null;
      const bearer = (c.env as any).CLOUDFLARE_TOKEN;
      const accountId =
        (c.env as any).ACCOUNT_ID || (c.env as any).R2_ACCOUNT_ID;

      if (bearer && accountId) {
        try {
          const headers = { Authorization: `Bearer ${bearer}` } as Record<
            string,
            string
          >;

          // Get R2 usage
          const r2Res = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
            { headers },
          );

          if (r2Res.ok) {
            const r2Data = await r2Res.json();
            cloudflareStats = {
              r2Buckets: (r2Data.result || []).length,
              r2BucketNames: (r2Data.result || []).map((b: any) => b.name),
            };
          }
        } catch (e) {
          // Silently fail - cloudflare stats are optional
          console.error("Failed to fetch Cloudflare stats:", e);
        }
      }

      const finalStats = {
        users: userCount?.count || 0,
        assets: assetStats?.total || 0,
        models: assetStats?.models || 0,
        images: assetStats?.images || 0,
        videos: assetStats?.videos || 0,
        documents: assetStats?.documents || 0,
        totalSize: assetStats?.totalSize || 0,
        shares: shareStats?.total || 0,
        activeShares: shareStats?.active || 0,
        recentActivity,
        storageByType: {
          model: assetStats?.modelSize || 0,
          image: assetStats?.imageSize || 0,
          video: assetStats?.videoSize || 0,
          document: assetStats?.documentSize || 0,
        },
        userGrowth: (userGrowth?.results || []).map(
          (row: { date: string; count: number }) => ({
            date: row.date as string,
            count: row.count as number,
          }),
        ),
        assetGrowth: (assetGrowth?.results || []).map(
          (row: { date: string; count: number }) => ({
            date: row.date as string,
            count: row.count as number,
          }),
        ),
        cloudflare: cloudflareStats,
      };

      console.log(
        "✅ Final admin stats response:",
        JSON.stringify(finalStats, null, 2),
      );

      return c.json(finalStats);
    } catch (error) {
      console.error("Stats error:", error);
      await logEvent(c.env, "admin:stats:error", "error", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Graceful fallback with zeroed stats instead of 500
      return c.json(
        {
          users: 0,
          assets: 0,
          models: 0,
          images: 0,
          videos: 0,
          documents: 0,
          totalSize: 0,
          shares: 0,
          activeShares: 0,
          recentActivity: [],
          storageByType: { model: 0, image: 0, video: 0, document: 0 },
          userGrowth: [],
          assetGrowth: [],
          cloudflare: null,
        },
        200,
      );
    }
  });

  app.delete("/assets/:key", async (c) => {
    const key = c.req.param("key");
    try {
      // 1. Delete from R2 Storage
      await c.env.ASSETS.delete(key);

      // 2. Delete from D1 Database
      const { success } = await c.env.DB.prepare(
        "DELETE FROM assets WHERE r2_key = ?",
      )
        .bind(key)
        .run();

      if (!success) {
        throw new Error("Failed to delete asset record from database.");
      }

      await logEvent(c.env, `Admin deleted asset: ${key}`);
      return c.json({ success: true, message: "Asset deleted successfully." });
    } catch (error) {
      console.error(`Failed to delete asset ${key}:`, error);
      return c.json({ error: `Failed to delete asset ${key}` }, 500);
    }
  });

  // --- User Management ---

  // GET /api/admin/users - Fetch all users
  app.get("/users", async (c) => {
    try {
      const users = await getAllUsers(c.env.DB);
      return c.json({ success: true, users: users || [] });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      return c.json({ error: "Failed to fetch users" }, 500);
    }
  });

  // POST /api/admin/upload-ai-resource - Upload AI resource file (admin only)
  app.post("/upload-ai-resource", async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return c.json({ error: "No file provided" }, 400);
      const userIdStr = formData.get("userId") as string | null;
      const userId = userIdStr ? parseInt(userIdStr) : c.get("user").id;
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const type = ext === "glb" ? "model" : ext === "pdf" ? "pdf" : "document";
      const uuid = crypto.randomUUID();
      const timestamp = Date.now();
      const r2Key = `ai/${timestamp}_${uuid}.${ext}`;
      await c.env.ASSETS.put(r2Key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
        customMetadata: { uploadedBy: String(userId), originalName: file.name },
      });
      await c.env.DB.prepare(
        `INSERT INTO assets (user_id, r2_key, file_name, file_type, size, upload_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          userId,
          r2Key,
          file.name,
          type,
          file.size,
          new Date().toISOString(),
        )
        .run();
      return c.json({ success: true, message: "AI resource uploaded" });
    } catch (error) {
      console.error("AI resource upload error:", error);
      return c.json({ error: "Failed to upload AI resource" }, 500);
    }
  });

  // POST /api/admin/users - Create a new user
  app.post("/users", async (c) => {
    try {
      const { email, username, password } =
        await c.req.json<CreateUserRequest>();
      if (!email || !username || !password) {
        return c.json(
          { error: "Email, username, and password are required" },
          400,
        );
      }

      // Prevent duplicates with a clear 409 message
      const existing = await c.env.DB.prepare(
        "SELECT id, username, email FROM users WHERE username = ? OR email = ?",
      )
        .bind(username, email)
        .first();
      if (existing) {
        return c.json(
          {
            error:
              (existing as any).username === username
                ? "Username already exists"
                : "Email already exists",
          },
          409,
        );
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await createUser(c.env.DB, {
        email,
        username,
        hashedPassword,
        is_admin: 0, // Default to non-admin
      });

      await logEvent(
        c.env,
        `Admin created new user: ${username} (ID: ${newUser.id})`,
      );
      return c.json({ success: true, user: newUser }, 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Failed to create user:", msg);
      // Surface sqlite unique errors better
      if (/UNIQUE/i.test(msg)) {
        return c.json({ error: "Username or email already exists" }, 409);
      }
      return c.json({ error: "Failed to create user" }, 500);
    }
  });

  // PUT /api/admin/users/:id - Update user details
  app.put("/users/:id", async (c) => {
    try {
      const userId = c.req.param("id");
      const updates = await c.req.json<Partial<User>>();

      // Prevent changing security fields directly through this endpoint
      delete (updates as Partial<User>).hashedPassword;
      delete updates.id;

      if (Object.keys(updates).length === 0) {
        return c.json({ error: "No update fields provided" }, 400);
      }

      const updatedUser = await updateUser(c.env.DB, parseInt(userId), updates);

      await logEvent(c.env, `Admin updated user details for ID: ${userId}`);
      return c.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Failed to update user:", error);
      return c.json({ error: "Failed to update user" }, 500);
    }
  });

  // PUT /api/admin/users/:id/password - Reset a user's password
  app.put("/users/:id/password", async (c) => {
    try {
      const userId = c.req.param("id");
      const { newPassword } = await c.req.json();
      if (!newPassword)
        return c.json({ error: "New password is required" }, 400);

      const hashedPassword = await hashPassword(newPassword);

      await updateUser(c.env.DB, parseInt(userId), {
        hashedPassword,
      });

      await logEvent(c.env, `Admin updated password for user ID: ${userId}`);
      return c.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Password update error:", error);
      return c.json({ error: "Failed to update password" }, 500);
    }
  });

  // DELETE /api/admin/users/:id - Delete a user
  app.delete("/users/:id", async (c) => {
    try {
      const userId = c.req.param("id");
      const loggedInUser = c.get("user");

      if (loggedInUser.id === parseInt(userId)) {
        return c.json({ error: "Cannot delete your own account" }, 403);
      }

      await deleteUser(c.env.DB, parseInt(userId));

      await logEvent(c.env, `Admin deleted user ID: ${userId}`);
      return c.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error);
      return c.json({ error: "Failed to delete user" }, 500);
    }
  });

  // --- Log Management ---

  // GET /api/admin/logs - Fetch system logs (optional query: ?level=&limit=&start=&end=)
  app.get("/logs", async (c) => {
    try {
      const url = new URL(c.req.url);
      const levelParam = url.searchParams.get("level") as
        | "info"
        | "warn"
        | "error"
        | "debug"
        | null;
      const limitParam = url.searchParams.get("limit");
      const startTime = url.searchParams.get("start") || undefined;
      const endTime = url.searchParams.get("end") || undefined;
      const limit = Math.max(
        1,
        Math.min(1000, parseInt(limitParam || "100", 10)),
      );
      const logs = await getLogs(c.env, {
        level: levelParam ?? undefined,
        limit,
        startTime,
        endTime,
      });
      return c.json({ success: true, logs: logs || [] }, 200);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      return c.json({ error: "Failed to fetch logs" }, 500);
    }
  });

  // DELETE /api/admin/logs - Clear logs (optionally by level)
  app.delete("/logs", async (c) => {
    try {
      const url = new URL(c.req.url);
      const level = url.searchParams.get("level") as
        | "info"
        | "warn"
        | "error"
        | "debug"
        | null;
      const { clearLogs } = await import("../utils/log");
      const count = await clearLogs(c.env, level ?? undefined);
      await logEvent(c.env, `Admin cleared ${count} log entries`, "warn");
      return c.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Failed to clear logs:", error);
      return c.json({ error: "Failed to clear logs" }, 500);
    }
  });

  // --- Database management ---
  app.get("/db/status", async (c) => {
    try {
      const tables = ["users", "assets", "shares", "migrations"];
      const results: Array<{ name: string; rows: number }> = [];
      for (const t of tables) {
        const row = await c.env.DB.prepare(
          `SELECT COUNT(*) as cnt FROM ${t}`,
        ).first<{ cnt: number }>();
        results.push({ name: t, rows: row?.cnt ?? 0 });
      }
      const migrations = await c.env.DB.prepare(
        "SELECT version, applied_at FROM migrations ORDER BY id ASC",
      ).all();
      return c.json({
        success: true,
        tables: results,
        migrations: migrations.results || [],
      });
    } catch (e) {
      return c.json({ error: "Failed to read DB status" }, 500);
    }
  });

  app.post("/db/cleanup", async (c) => {
    try {
      await cleanupOrphanedData(c.env.DB);
      return c.json({ success: true, message: "Cleanup completed" });
    } catch (e) {
      return c.json({ error: "Cleanup failed" }, 500);
    }
  });

  app.post("/db/ensure-schema", async (c) => {
    try {
      await initializeDatabase(c.env.DB);
      return c.json({ success: true, message: "Schema ensured" });
    } catch (e) {
      return c.json({ error: "Failed to ensure schema" }, 500);
    }
  });

  app.post("/db/analyze", async (c) => {
    try {
      // SQLite pragmas supported by D1; ANALYZE might be a no-op but try
      try {
        await c.env.DB.prepare("ANALYZE").run();
      } catch {}
      return c.json({ success: true });
    } catch (e) {
      return c.json({ error: "Failed to analyze DB" }, 500);
    }
  });

  app.get("/db/export", async (c) => {
    try {
      const users = await c.env.DB.prepare("SELECT * FROM users").all();
      const assets = await c.env.DB.prepare("SELECT * FROM assets").all();
      const shares = await c.env.DB.prepare("SELECT * FROM shares").all();
      const migrations = await c.env.DB.prepare(
        "SELECT * FROM migrations",
      ).all();
      const data = {
        exported_at: new Date().toISOString(),
        users: users.results || [],
        assets: assets.results || [],
        shares: shares.results || [],
        migrations: migrations.results || [],
      };
      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename=export-${Date.now()}.json`,
        },
      });
    } catch (e) {
      return c.json({ error: "Export failed" }, 500);
    }
  });

  // Update model sharing status and user upload limits
  app.post("/update-model-sharing", async (c) => {
    try {
      const { assetKey, isPublic, increaseUserLimit, targetUserId } =
        await c.req.json();

      if (!assetKey || typeof isPublic !== "boolean") {
        return c.json({ error: "Invalid request data" }, 400);
      }

      // Update the asset's public status
      await c.env.DB.prepare(
        "UPDATE assets SET is_public = ? WHERE r2_key = ? AND is_admin_upload = 1",
      )
        .bind(isPublic ? 1 : 0, assetKey)
        .run();

      // If making public and user limit increase requested
      if (isPublic && increaseUserLimit && targetUserId) {
        const user = await c.env.DB.prepare(
          "SELECT max_models FROM users WHERE id = ?",
        )
          .bind(targetUserId)
          .first<{ max_models: number }>();

        if (user) {
          const newLimit = user.max_models + 1;
          await c.env.DB.prepare("UPDATE users SET max_models = ? WHERE id = ?")
            .bind(newLimit, targetUserId)
            .run();

          await logEvent(c.env, "admin:user:limit:increased", "info", {
            user_id: c.get("user").id, // Admin's ID as user_id
            // Removed invalid LogEntry properties
          });
        }
      }

      await logEvent(c.env, "admin:model:sharing:updated", "info", {
        user_id: c.get("user").id, // Admin's ID as user_id
        // Removed invalid LogEntry properties
      });

      return c.json({
        success: true,
        message: `Model ${isPublic ? "shared publicly" : "made private"}${
          isPublic && increaseUserLimit
            ? " and user upload limit increased"
            : ""
        }`,
      });
    } catch (error) {
      console.error("Update model sharing error:", error);
      await logEvent(c.env, "admin:model:sharing:error", "error", {
        user_id: c.get("user").id, // Admin's ID as user_id
        // Removed invalid LogEntry properties
      });
      return c.json({ error: "Failed to update model sharing" }, 500);
    }
  });

  // Get public model statistics for admin dashboard
  app.get("/public-models-stats", async (c) => {
    try {
      const stats = await c.env.DB.prepare(
        `
        SELECT 
          COUNT(*) as total_public_models,
          COUNT(DISTINCT user_id) as users_with_access,
          SUM(size) as total_public_size,
          AVG(size) as avg_model_size
        FROM assets 
        WHERE is_public = 1 AND is_admin_upload = 1
      `,
      ).first();

      const recentlyShared = await c.env.DB.prepare(
        `
        SELECT 
          assets.file_name,
          assets.size,
          assets.upload_date,
          users.username as uploader
        FROM assets
        JOIN users ON assets.uploaded_by_admin = users.id
        WHERE assets.is_public = 1 AND assets.is_admin_upload = 1
        ORDER BY assets.upload_date DESC
        LIMIT 10
      `,
      ).all();

      return c.json({
        success: true,
        stats: {
          totalPublicModels: stats?.total_public_models || 0,
          usersWithAccess: stats?.users_with_access || 0,
          totalPublicSize: stats?.total_public_size || 0,
          avgModelSize: stats?.avg_model_size || 0,
        },
        recentlyShared: recentlyShared.results || [],
      });
    } catch (error) {
      console.error("Public models stats error:", error);
      return c.json({ error: "Failed to get public models statistics" }, 500);
    }
  });

  return app;
}
