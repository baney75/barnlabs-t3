// src/routes/public.ts
import { Hono } from "hono";
import { SignJWT } from "jose";
import { Resend } from "resend";
import { verifyToken } from "../middleware/auth";
import type { Env, Variables, User } from "../types";
import { loginUser, registerUser } from "../utils/auth";
import { hashPassword, comparePasswords } from "../utils/auth";
import { getUserByIdentifier, getUserCount } from "../utils/db";
import { logEvent } from "../utils/log";
import {
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "../utils/errors";
import { validateLoginRequest, validateEmail } from "../utils/validation";
import { createKVCache } from "../utils/cache";

export function addPublicRoutes(
  app: Hono<{ Bindings: Env; Variables: Variables }>,
) {
  // ---------------------------------------------------------------------------
  // Temporary compatibility stub for legacy clients requesting /api/v1/courses.
  // The current version of BARN does not implement course objects yet, but
  // some cached service-worker scripts (or old bookmarks) may still request
  // this Canvas-style endpoint. Instead of returning a 404 that clutters the
  // console, respond with an empty list so the request gracefully degrades.
  // ---------------------------------------------------------------------------
  app.get("/v1/courses", (c) => c.json({ success: true, courses: [] }));

  // GET /api/status: Check if the application needs initial setup
  app.get(
    "/status",
    withErrorHandler(async (c) => {
      try {
        // Use cache for status check since it's frequently accessed
        const cache = createKVCache(c.env);
        const cacheKey = "system:status";

        let cached = await cache.get<{ setupNeeded: boolean }>(cacheKey);
        if (cached) {
          return createSuccessResponse(c, cached);
        }

        const userCount = await getUserCount(c.env.DB);
        const result = { setupNeeded: userCount === 0 };

        // Cache for 5 minutes
        await cache.set(cacheKey, result, { ttl: 300 });

        return createSuccessResponse(c, result);
      } catch (e: unknown) {
        // This can happen if the database or table doesn't exist yet.
        // In this case, setup is definitely needed.
        console.error(
          "Status check error, assuming setup is needed:",
          (e as Error).message,
        );
        return createSuccessResponse(c, { setupNeeded: true });
      }
    }),
  );

  // POST /api/setup/request-code: Send one-time admin setup code to fixed admin email
  app.post("/setup/request-code", async (c) => {
    try {
      const countResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM users",
      ).first<{ count: number }>();
      const userCount = countResult?.count ?? 0;

      if (userCount > 0) {
        return c.json({ error: "Setup already completed; users exist" }, 400);
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const ttlSeconds = 10 * 60; // 10 minutes
      await c.env.LOGS.put("admin_setup_code", code, {
        expirationTtl: ttlSeconds,
      });

      if (c.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(c.env.RESEND_API_KEY);
          const result = await resend.emails.send({
            from: "BARN Labs <no-reply@msg.barnlabs.net>",
            to: ["projectbarnlab@gmail.com"],
            subject: "BARN Labs Admin Setup Code",
            html: `<h1>Admin Setup</h1><p>Your setup code is:</p><p style="font-size:24px"><strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
          });
          console.log("Setup code email sent:", JSON.stringify(result));
        } catch (emailError) {
          console.error("Resend email failed:", (emailError as Error).message);
        }
      }

      return c.json({ success: true, message: "Setup code processed" });
    } catch (e: unknown) {
      console.error("Setup request code error:", (e as Error).message);
      return c.json({ error: "Failed to send setup code" }, 500);
    }
  });

  // POST /api/setup/verify: Verify code and create initial admin
  app.post("/setup/verify", async (c) => {
    try {
      const countResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM users",
      ).first<{ count: number }>();
      const userCount = countResult?.count ?? 0;
      if (userCount > 0) {
        return c.json({ error: "Setup already completed; users exist" }, 400);
      }

      const { username, password, code } = await c.req.json();
      if (!username || !password || !code) {
        return c.json({ error: "Username, password, and code required" }, 400);
      }

      const storedCode = await c.env.LOGS.get("admin_setup_code");
      if (!storedCode || storedCode !== code) {
        return c.json({ error: "Invalid or expired code" }, 400);
      }

      const email = "projectbarnlab@gmail.com";
      const hashedPassword = await hashPassword(password);
      await c.env.DB.prepare(
        "INSERT INTO users (username, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
      )
        .bind(username, email, hashedPassword, new Date().toISOString())
        .run();

      await c.env.LOGS.delete("admin_setup_code");

      return c.json({
        success: true,
        message: `Initial admin user created: ${username}`,
      });
    } catch (e: unknown) {
      console.error("Setup verify error:", (e as Error).message);
      return c.json({ error: "Failed to create initial user" }, 500);
    }
  });

  // POST /api/login: Handle user authentication with robust diagnostics.
  app.post("/login", async (c) => {
    try {
      const { identifier, password } = await c.req.json();
      if (!identifier || !password) {
        return c.json({ error: "Credentials required" }, 400);
      }
      console.log(`[login] attempt for identifier=${identifier}`);

      const user: User | null = await getUserByIdentifier(c.env.DB, identifier);

      if (!user) {
        console.log(`[login] no user found for identifier=${identifier}`);
        return c.json({ error: "Invalid credentials" }, 401);
      }

      if (!user.hashedPassword) {
        console.log(
          `[login] user has no password_hash set. id=${user.id} email=${user.email}`,
        );
        return c.json({ error: "Invalid credentials" }, 401);
      }

      const passwordIsValid = await comparePasswords(
        password,
        user.hashedPassword,
      );
      if (!passwordIsValid) {
        console.log(`[login] password mismatch for user id=${user.id}`);
        return c.json({ error: "Invalid credentials" }, 401);
      }

      if (!c.env.JWT_SECRET || c.env.JWT_SECRET.trim().length === 0) {
        console.error("[login] JWT_SECRET is not configured");
        return c.json({ error: "Server misconfiguration" }, 500);
      }
      const secret = new TextEncoder().encode(c.env.JWT_SECRET.trim());
      const token = await new SignJWT({
        id: user.id,
        username: user.username,
        is_admin: user.is_admin,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

      await c.env.DB.prepare("UPDATE users SET last_login = ? WHERE id = ?")
        .bind(new Date().toISOString(), user.id)
        .run();

      return c.json({
        message: "Login successful",
        token,
        user: {
          username: user.username,
          email: user.email,
          is_admin: !!user.is_admin,
        },
      });
    } catch (e: unknown) {
      console.error("[login] error:", (e as Error).message, (e as Error).stack);
      return c.json({ error: "Internal Server Error" }, 500);
    }
  });

  // GET /api/share/:shareId: Fetch shared dashboard (public, tolerant to missing rows).
  app.get("/share/:shareId", async (c) => {
    const shareId = c.req.param("shareId");
    try {
      const shareData = await c.env.DB.prepare(
        "SELECT * FROM shares WHERE id = ?",
      )
        .bind(shareId)
        .first<{ expires_at: string | null }>();

      if (!shareData)
        return c.json({ success: false, error: "Share link not found" }, 404);

      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        return c.json({ error: "This share link has expired" }, 410); // 410 Gone
      }

      return c.json({ success: true, data: shareData });
    } catch (e: unknown) {
      console.error(
        `Failed to retrieve share link ${shareId}:`,
        (e as Error).message,
      );
      return c.json({ error: "Failed to retrieve shared content" }, 500);
    }
  });

  // USDZ helpers removed; AR uses GLB with WebXR/ARCore Scene Viewer universally

  // Diagnostics: return service info
  app.get("/info", async (c) => {
    const url = new URL(c.req.url);
    return c.json({ origin: `${url.protocol}//${url.host}` });
  });

  // GET /api/featured-model: return a signed GLB URL for the featured/latest model
  app.get("/featured-model", async (c) => {
    try {
      // Optional override via env var
      const featuredKey = (c.env as any).FEATURED_ASSET_KEY as
        | string
        | undefined;
      let key: string | null = featuredKey || null;
      if (!key) {
        const row = await c.env.DB.prepare(
          "SELECT r2_key FROM assets WHERE file_type = 'model' AND r2_key LIKE '%.glb' ORDER BY upload_date DESC LIMIT 1",
        ).first<{ r2_key: string }>();
        key = row?.r2_key || null;
      }
      if (!key) return c.json({});

      const secret = new TextEncoder().encode((c.env.JWT_SECRET || "").trim());
      const token = await new SignJWT({ key })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("10m")
        .sign(secret);
      const url = new URL(c.req.url);
      const signed = `${url.protocol}//${url.host}/model/${encodeURIComponent(key)}?t=${encodeURIComponent(
        token,
      )}`;
      return c.json({ url: signed, key });
    } catch (e) {
      return c.json({ error: "Failed to fetch featured model" }, 500);
    }
  });

  // Proxy external model URLs to avoid CORS/content-type issues
  // GET /api/proxy-model?url=...
  app.get("/proxy-model", async (c) => {
    try {
      const requestUrl = new URL(c.req.url);
      const target = requestUrl.searchParams.get("url");
      if (!target) return c.json({ error: "Missing url" }, 400);
      const parsed = new URL(target);

      // Whitelist allowed hosts
      const allowed: string[] = [];
      const envBase = (c.env.PUBLIC_BUCKET_BASE_URL || "").trim();
      if (envBase) {
        try {
          allowed.push(new URL(envBase).host);
        } catch {}
      }
      allowed.push("bucket1.barnlabs.net");

      if (!allowed.includes(parsed.host)) {
        return c.json({ error: "Host not allowed" }, 403);
      }

      const upstream = await fetch(parsed.toString());
      if (!upstream.ok) {
        return c.json({ error: `Upstream ${upstream.status}` }, 502);
      }
      const headers = new Headers();
      headers.set("cache-control", "public, max-age=3600");
      const ct =
        upstream.headers.get("content-type") ||
        (parsed.pathname.endsWith(".glb")
          ? "model/gltf-binary"
          : parsed.pathname.endsWith(".gltf")
            ? "model/gltf+json"
            : "application/octet-stream");
      headers.set("content-type", ct);
      // Allow same-origin usage
      const url = new URL(c.req.url);
      headers.set(
        "Access-Control-Allow-Origin",
        `${url.protocol}//${url.host}`,
      );
      return new Response(upstream.body, { headers, status: 200 });
    } catch (e) {
      return c.json({ error: "Proxy failed" }, 500);
    }
  });

  // POST /api/model-view/log: collect front-end viewer telemetry (best-effort, structured)
  app.post("/model-view/log", async (c) => {
    try {
      const body = (await c.req.json().catch(() => ({}))) as {
        event?: string;
        src?: string;
        detail?: string;
        [k: string]: unknown;
      };
      const ua = c.req.header("user-agent") || "";
      const ip =
        c.req.header("CF-Connecting-IP") ||
        c.req.header("x-forwarded-for") ||
        undefined;
      await logEvent(c.env, `model-view:${body?.event || "unknown"}`, "info", {
        user_agent: ua,
        ip,
        event: body?.event,
        src: body?.src,
        detail:
          typeof body?.detail === "string"
            ? body.detail
            : JSON.stringify(body?.detail ?? null),
        referrer: c.req.header("referer") || undefined,
        path: new URL(c.req.url).pathname,
        method: c.req.method,
      });
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false }, 200);
    }
  });

  // POST /api/forgot-password/request: Request password reset with diagnostics
  app.post("/forgot-password/request", async (c) => {
    try {
      const { email } = await c.req.json();
      if (!email) return c.json({ error: "Email required" }, 400);

      const user = await c.env.DB.prepare(
        "SELECT id FROM users WHERE email = ?",
      )
        .bind(email)
        .first<User>();

      // For security, always return a success message, even if the user is not found.
      if (user) {
        const resetToken = crypto.randomUUID();
        const expires = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour from now

        await c.env.DB.prepare(
          "UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?",
        )
          .bind(resetToken, expires, user.id)
          .run();

        console.log(`[reset-request] token for ${email}: ${resetToken}`);

        // For development, return the token to make testing easier.
        if (c.env.ENVIRONMENT !== "production") {
          return c.json({
            success: true,
            message: "Password reset token generated (for development).",
            token: resetToken,
          });
        }

        // In production, send the email.
        if (c.env.RESEND_API_KEY) {
          const resend = new Resend(c.env.RESEND_API_KEY);
          const resetLink = `https://barnlabs.net/reset-password?token=${resetToken}`;

          await resend.emails.send({
            from: "BARN Labs <no-reply@msg.barnlabs.net>",
            to: [email],
            subject: "Barn Labs Password Reset",
            html: `
              <h1>Password Reset Request</h1>
              <p>Click the link below to reset your password:</p>
              <a href="${resetLink}">Reset Password</a>
              <p>This link will expire in 1 hour.</p>
            `,
          });
        }
      }

      return c.json({
        success: true,
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    } catch (e: unknown) {
      console.error("Password reset request error:", (e as Error).message);
      return c.json({ error: "Failed to process reset request" }, 500);
    }
  });

  // POST /api/forgot-password/reset: Reset password with token and logs
  app.post("/forgot-password/reset", async (c) => {
    try {
      const { token, newPassword } = await c.req.json();
      if (!token || !newPassword)
        return c.json({ error: "Token and new password required" }, 400);

      const user = await c.env.DB.prepare(
        "SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?",
      )
        .bind(token, new Date().toISOString())
        .first<User>();

      if (!user) {
        console.log(`[reset] invalid or expired token used`);
        return c.json({ error: "Invalid or expired token" }, 400);
      }

      const hashedPassword = await hashPassword(newPassword);

      await c.env.DB.prepare(
        "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?",
      )
        .bind(hashedPassword, user.id)
        .run();

      console.log(`[reset] password reset for user id=${user.id}`);
      return c.json({
        success: true,
        message: "Password has been reset successfully.",
      });
    } catch (e: unknown) {
      console.error("Password reset error:", (e as Error).message);
      return c.json({ error: "Failed to reset password" }, 500);
    }
  });

  // GET /api/dashboard/:username: A secure way to fetch dashboard data.
  app.get("/dashboard/:username", verifyToken, async (c) => {
    try {
      const authenticatedUser = c.get("user");
      const requestedUsername = c.req.param("username");

      if (
        authenticatedUser.username !== requestedUsername &&
        !authenticatedUser.is_admin
      ) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const userToView: User | null = await c.env.DB.prepare(
        "SELECT * FROM users WHERE username = ?",
      )
        .bind(requestedUsername)
        .first();

      if (!userToView) return c.json({ error: "User not found" }, 404);

      const countResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM assets WHERE user_id = ? AND file_type = 'model'",
      )
        .bind(userToView.id)
        .first<{ count: number }>();
      const count = countResult?.count ?? 0;

      return c.json({
        success: true,
        content: userToView.dashboard_content || "[]",
        logo_url: userToView.logo_url,
        max_models: userToView.max_models,
        current_models: count,
        ai_enabled: !!userToView.ai_enabled,
      });
    } catch (e: unknown) {
      console.error("Dashboard fetch error:", (e as Error).message);
      return c.json({ error: "Failed to fetch dashboard content" }, 500);
    }
  });

  // POST /api/login: User authentication
  app.post(
    "/login",
    withErrorHandler(async (c) => {
      return await loginUser(c);
    }),
  );

  // POST /api/register: User registration
  app.post(
    "/register",
    withErrorHandler(async (c) => {
      return await registerUser(c);
    }),
  );

  // GET /api/health: Health check endpoint
  app.get(
    "/health",
    withErrorHandler(async (c) => {
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        checks: {
          database: "ok",
          storage: "ok",
        },
      };

      try {
        // Quick database check
        await c.env.DB.prepare("SELECT 1").first();
      } catch (error) {
        health.status = "unhealthy";
        health.checks.database = "error";
      }

      const statusCode = health.status === "healthy" ? 200 : 503;
      return createSuccessResponse(c, health, statusCode);
    }),
  );
}
