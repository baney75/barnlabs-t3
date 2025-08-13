// src/worker.ts
import { Hono } from "hono";
import { initializeDatabase } from "./utils/db";
import type { Env, Variables } from "./types";
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import { jwtVerify } from "jose";
import { logEvent, logError } from "./utils/log";
import { rateLimit } from "./middleware/auth";

import { addAdminRoutes } from "./routes/admin";
import { addUserRoutes } from "./routes/user";
import { addPublicRoutes } from "./routes/public";
import { addModelRoutes } from "./routes/model";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Cache for static asset manifest; loaded lazily so local dev doesn't crash
let assetManifestCache: Record<string, string> | null = null;
// One-time DB initialization guard per isolate to avoid heavy work every request
let dbReady = false;
let dbInitPromise: Promise<void> | null = null;

function getCandidateSecrets(
  primary: string | undefined,
  alt?: string | undefined,
): string[] {
  const candidates: string[] = [];
  if (typeof primary === "string" && primary.length > 0) {
    candidates.push(primary);
    const trimmed = primary.trim();
    if (trimmed !== primary && trimmed.length > 0) candidates.push(trimmed);
  }
  if (typeof alt === "string" && alt.length > 0) {
    candidates.push(alt);
    const trimmedAlt = alt.trim();
    if (trimmedAlt !== alt && trimmedAlt.length > 0)
      candidates.push(trimmedAlt);
  }
  // Ensure uniqueness while preserving order
  return Array.from(new Set(candidates));
}

// --- ENHANCED MIDDLEWARE ---
app.use("*", async (c, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  const url = new URL(c.req.url);
  const method = c.req.method;
  const ip =
    c.req.header("CF-Connecting-IP") ||
    c.req.header("x-forwarded-for") ||
    "unknown";
  const ua = c.req.header("user-agent") || undefined;

  // Set request ID header for better tracing
  c.header("X-Request-Id", requestId);

  // Ensure DB is initialized lazily
  if (!dbReady) {
    if (!dbInitPromise) {
      dbInitPromise = (async () => {
        try {
          await initializeDatabase(c.env.DB);
          dbReady = true;
        } catch (e) {
          console.error("initializeDatabase failed:", (e as Error).message);
        } finally {
          dbInitPromise = null;
        }
      })();
    }
    try {
      await dbInitPromise;
    } catch (initErr) {
      console.warn("DB init promise rejected:", (initErr as Error).message);
    }
  }

  // Enhanced CORS and security headers
  const origin = c.req.header("Origin") || "";
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000", // Additional dev port
    "https://barnlabs.net",
    "https://www.barnlabs.net",
  ];

  if (allowedOrigins.includes(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
  }

  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, HEAD",
  );
  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-Id, X-Forwarded-For",
  );
  c.header(
    "Access-Control-Expose-Headers",
    "X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
  );

  // Security headers
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");

  // Allow WebXR on supported browsers (needed for VR/AR buttons to work over HTTPS)
  c.header("Permissions-Policy", "xr-spatial-tracking=(self)");

  // Cache control for API responses (prevent caching of dynamic content)
  if (url.pathname.startsWith("/api/")) {
    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  }

  try {
    await next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Log the error
    await logError(c.env, `Unhandled error in ${method} ${url.pathname}`, {
      request_id: requestId,
      method,
      path: url.pathname,
      error: errorMessage,
      ip,
      user_agent: ua,
    });

    // Return generic error response
    return c.json(
      {
        error: "Internal server error",
        requestId,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  } finally {
    // Enhanced structured request logging
    const duration = Date.now() - start;
    const path = url.pathname;
    const isLoggable = path.startsWith("/api/") || path.startsWith("/model/");

    if (isLoggable) {
      const logLevel = c.res.status >= 400 ? "warn" : "debug";
      await logEvent(c.env, `${method} ${path}`, logLevel, {
        request_id: requestId,
        route: path.startsWith("/api/") ? "/api" : "/model",
        method,
        path,
        status: c.res.status,
        duration_ms: duration,
        ip,
        user_agent: ua,
        referrer: c.req.header("referer") || undefined,
        content_length: c.res.headers.get("content-length") || undefined,
      });
    }

    // Add performance headers
    c.header("Server-Timing", `total;dur=${duration}`);
  }
});
app.options("*", (c) => c.body(null, 204));

// --- API ROUTER SETUP WITH RATE LIMITING ---
const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// Add status endpoint with minimal rate limiting (for app initialization)
api.get("/status", rateLimit(120, 60000), async (c) => {
  try {
    const userCountResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users",
    ).first<{ count: number }>();

    const userCount = userCountResult?.count ?? 0;
    const setupNeeded = userCount === 0;

    // Enhanced logging for debugging
    console.log(
      `📊 Status check: ${userCount} users found, setupNeeded: ${setupNeeded}`,
    );

    // Add debug info in development
    const debugInfo =
      process.env.NODE_ENV === "development"
        ? {
            userCount,
            userCountResult,
            setupNeeded,
            timestamp: new Date().toISOString(),
          }
        : undefined;

    return c.json({
      success: true,
      setupNeeded,
      ...(debugInfo && { debug: debugInfo }),
    });
  } catch (e: unknown) {
    const error = e as Error;
    console.error(
      "❌ Status check error, assuming setup is needed:",
      error.message,
      error.stack,
    );
    return c.json({
      success: true,
      setupNeeded: true,
      error: `Database error: ${error.message}`,
    });
  }
});

// Add public routes with rate limiting (more lenient for status checks)
const publicApi = new Hono<{ Bindings: Env; Variables: Variables }>();
publicApi.use("*", rateLimit(60, 60000)); // 60 requests per minute for public (increased from 30)
addPublicRoutes(publicApi);
api.route("/", publicApi);

// Add authenticated routes with less restrictive rate limiting
const adminApi = new Hono<{ Bindings: Env; Variables: Variables }>();
adminApi.use("*", rateLimit(200, 60000)); // 200 requests per minute for admin
addAdminRoutes(adminApi);
api.route("/admin", adminApi);

const userApi = new Hono<{ Bindings: Env; Variables: Variables }>();
userApi.use("*", rateLimit(100, 60000)); // 100 requests per minute for users
addUserRoutes(userApi);
api.route("/user", userApi);

const modelApi = new Hono<{ Bindings: Env; Variables: Variables }>();
modelApi.use("*", rateLimit(50, 60000)); // 50 requests per minute for model operations
addModelRoutes(modelApi);
api.route("/model", modelApi);

app.route("/api", api);

// --- MODEL PROXY ROUTE (serve R2 objects consistently in dev/prod) ---
app.get("/model/:key{.+}", async (c) => {
  const key = c.req.param("key");
  try {
    // Get asset info with admin sharing controls
    const assetRow = await c.env.DB.prepare(
      "SELECT user_id, is_public, is_admin_upload, uploaded_by_admin FROM assets WHERE r2_key = ?",
    )
      .bind(key)
      .first<{
        user_id: number;
        is_public: number;
        is_admin_upload: number;
        uploaded_by_admin: number | null;
      }>();

    if (!assetRow) return c.text("Not Found", 404);

    const authHeader = c.req.header("Authorization");
    const referer = c.req.header("Referer") || "";
    let isAuthorized = false;

    // Gather possible secrets (raw, trimmed, and optional ALT)
    const candidateSecrets = getCandidateSecrets(
      c.env.JWT_SECRET,
      (c.env as any).JWT_SECRET_ALT,
    );

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      for (const s of candidateSecrets) {
        try {
          const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(s),
          );
          const requester = payload as unknown as {
            id: number;
            is_admin?: boolean;
          };

          // Check authorization based on new access control
          if (requester.is_admin) {
            // Admins can access all models
            isAuthorized = true;
            break;
          } else if (requester.id === assetRow.user_id) {
            // Users can access their own models
            isAuthorized = true;
            break;
          } else if (
            assetRow.is_public === 1 &&
            assetRow.is_admin_upload === 1
          ) {
            // Regular users can access public admin-shared models
            isAuthorized = true;
            break;
          }
        } catch {
          // try next
        }
      }
    }

    // Allow access without token if coming from a valid share page for the same user
    if (!isAuthorized && referer.includes("/share/")) {
      const shareId = referer.split("/share/")[1]?.split(/[?#]/)[0];
      if (shareId) {
        const share = await c.env.DB.prepare(
          "SELECT user_id, expires_at FROM shares WHERE id = ?",
        )
          .bind(shareId)
          .first<{ user_id: number; expires_at: string | null }>();
        if (share) {
          const notExpired =
            !share.expires_at || new Date(share.expires_at) > new Date();
          if (notExpired) {
            // Allow share access if:
            // 1. Asset belongs to share owner, OR
            // 2. Asset is a public admin-shared model
            if (
              share.user_id === assetRow.user_id ||
              (assetRow.is_public === 1 && assetRow.is_admin_upload === 1)
            ) {
              isAuthorized = true;
            }
          }
        }
      }
    }

    // Allow JWT URL token for short-lived access (for iOS Quick Look etc.)
    if (!isAuthorized) {
      const url = new URL(c.req.url);
      const t = url.searchParams.get("t");
      if (t) {
        for (const s of candidateSecrets) {
          try {
            const { payload } = await jwtVerify(t, new TextEncoder().encode(s));
            if ((payload as any).key === key) {
              isAuthorized = true;
              break;
            }
          } catch {
            // try next
          }
        }
      }
    }

    if (!isAuthorized) return c.text("Unauthorized", 401);

    const object = await c.env.ASSETS.get(key);
    if (!object) return c.text("Not Found", 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    // Ensure long caching for immutable asset keys
    headers.set("cache-control", "public, max-age=31536000, immutable");
    // Provide a sensible default content-type if not present
    if (!headers.has("content-type")) {
      const contentType = key.endsWith(".glb")
        ? "model/gltf-binary"
        : key.endsWith(".gltf")
          ? "model/gltf+json"
          : "application/octet-stream";
      headers.set("content-type", contentType);
    }
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  } catch {
    return c.text("Not Found", 404);
  }
});

// --- STATIC ASSET SERVING & SPA FALLBACK (KV Asset Handler) ---
app.get("*", async (c) => {
  try {
    if (assetManifestCache === null) {
      try {
        // Dynamically import only in environments where available
        const mod = (await import("__STATIC_CONTENT_MANIFEST")) as unknown as {
          default: string;
        };
        assetManifestCache = JSON.parse(mod.default);
      } catch {
        assetManifestCache = {};
      }
    }
    // Enhanced static asset serving for PWA icons and other assets
    const url = new URL(c.req.url);
    if (
      url.pathname === "/pwa-192x192.png" ||
      url.pathname === "/pwa-512x512.png" ||
      url.pathname === "/favicon.ico" ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname.startsWith("/Hero-Assets/") ||
      url.pathname.startsWith("/textures/")
    ) {
      let key = url.pathname.replace("/", "");
      try {
        // Try direct key first
        let obj = await c.env.__STATIC_CONTENT.get(key);

        // If not found, try without leading slash variations
        if (!obj && key.startsWith("/")) {
          key = key.substring(1);
          obj = await c.env.__STATIC_CONTENT.get(key);
        }

        if (obj) {
          const headers = new Headers();

          // Set appropriate content type
          if (key.endsWith(".png")) {
            headers.set("content-type", "image/png");
          } else if (key.endsWith(".ico")) {
            headers.set("content-type", "image/x-icon");
          } else if (key.endsWith(".webmanifest")) {
            headers.set("content-type", "application/manifest+json");
          } else if (key.endsWith(".glb")) {
            headers.set("content-type", "model/gltf-binary");
          } else if (key.endsWith(".usdz")) {
            headers.set("content-type", "model/vnd.usdz+zip");
          } else if (key.endsWith(".jpg") || key.endsWith(".jpeg")) {
            headers.set("content-type", "image/jpeg");
          } else if (key.endsWith(".svg")) {
            headers.set("content-type", "image/svg+xml");
          } else {
            headers.set("content-type", "application/octet-stream");
          }

          headers.set("cache-control", "public, max-age=604800");
          return new Response(await obj.arrayBuffer(), { headers });
        } else {
          console.warn(`Static asset not found in KV: ${key}`);
        }
      } catch (error) {
        console.warn(`Failed to serve static asset ${key}:`, error);
      }
    }
    const spaRequestMapper = (request: Request) => {
      const url = new URL(request.url);
      if (!url.pathname.includes(".")) {
        return new Request(`${url.origin}/index.html`, request);
      }
      return request;
    };
    return await getAssetFromKV(
      {
        request: c.req.raw,
        waitUntil: (p: Promise<any>) => c.executionCtx.waitUntil(p),
      } as any, // Legacy type compatibility
      {
        cacheControl: { bypassCache: true },
        mapRequestToAsset: spaRequestMapper,
      },
    );
  } catch (e) {
    const message = (e as Error)?.message || "";
    if (message.includes("should only be called in a V8 Worker")) {
      return c.text("", 404);
    }
    return c.text("Not Found", 404);
  }
});

export default app;
