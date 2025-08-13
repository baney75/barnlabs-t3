// src/middleware/auth.ts
import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import type { Env, Variables, JWTPayload } from "../types";
import { createErrorResponse, AppError } from "../utils/errors";
import { logEvent } from "../utils/log";

type AuthContext = Context<{ Bindings: Env; Variables: Variables }>;

// Helper to get multiple JWT secret candidates
function getJWTSecrets(env: Env): string[] {
  const candidates: string[] = [];

  if (env.JWT_SECRET) {
    candidates.push(env.JWT_SECRET.trim());
  }

  // Support for JWT_SECRET_ALT for rolling secrets
  const altSecret = (env as any).JWT_SECRET_ALT;
  if (altSecret && typeof altSecret === "string") {
    candidates.push(altSecret.trim());
  }

  return candidates.filter((secret) => secret.length > 0);
}

// Enhanced JWT verification with multiple secret support
async function verifyJWTToken(
  token: string,
  secrets: string[],
): Promise<JWTPayload> {
  let lastError: Error | null = null;

  for (const secret of secrets) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      );

      // Validate payload structure
      const jwtPayload = payload as unknown as JWTPayload;
      if (!jwtPayload.sub && !jwtPayload.id) {
        throw new Error("Invalid payload: missing user identifier");
      }

      // Normalize payload (ensure both sub and id are present)
      return {
        ...jwtPayload,
        id: jwtPayload.id || jwtPayload.sub,
        sub: jwtPayload.sub || jwtPayload.id,
      };
    } catch (error) {
      lastError = error as Error;
      continue; // Try next secret
    }
  }

  throw lastError || new Error("Token verification failed");
}

export const verifyToken = async (c: AuthContext, next: Next) => {
  const requestId = c.req.header("X-Request-Id") || crypto.randomUUID();

  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      await logEvent(
        c.env,
        "Authentication failed: No authorization header",
        "warn",
        {
          request_id: requestId,
          path: new URL(c.req.url).pathname,
          ip: c.req.header("CF-Connecting-IP"),
        },
      );
      return createErrorResponse(
        c,
        "TOKEN_INVALID",
        "No authorization header provided",
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      await logEvent(
        c.env,
        "Authentication failed: Invalid authorization format",
        "warn",
        {
          request_id: requestId,
          path: new URL(c.req.url).pathname,
          ip: c.req.header("CF-Connecting-IP"),
        },
      );
      return createErrorResponse(
        c,
        "TOKEN_INVALID",
        "Invalid authorization header format",
      );
    }

    const token = authHeader.substring(7);
    if (!token) {
      return createErrorResponse(c, "TOKEN_INVALID", "Empty token provided");
    }

    // Get JWT secrets
    const secrets = getJWTSecrets(c.env);
    if (secrets.length === 0) {
      await logEvent(
        c.env,
        "JWT verification failed: No valid secrets configured",
        "error",
        {
          request_id: requestId,
          path: new URL(c.req.url).pathname,
        },
      );
      return createErrorResponse(c, "CONFIG_ERROR", "JWT configuration error");
    }

    // Verify token
    const payload = await verifyJWTToken(token, secrets);

    // Set user context with proper typing
    c.set("user", {
      id: payload.id,
      username: payload.username || "",
      email: payload.email,
      is_admin: payload.is_admin || 0,
      ai_enabled: 0, // Default value, can be updated from database if needed
    });

    await next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Token verification failed";

    await logEvent(c.env, `Authentication failed: ${errorMessage}`, "warn", {
      request_id: requestId,
      path: new URL(c.req.url).pathname,
      ip: c.req.header("CF-Connecting-IP"),
      error: errorMessage,
    });

    if (errorMessage.includes("expired")) {
      return createErrorResponse(c, "TOKEN_EXPIRED");
    }

    return createErrorResponse(c, "TOKEN_INVALID", errorMessage);
  }
};

export const adminAuth = async (c: AuthContext, next: Next) => {
  const user = c.get("user");
  const requestId = c.req.header("X-Request-Id") || crypto.randomUUID();

  if (!user) {
    await logEvent(c.env, "Admin access denied: No user context", "warn", {
      request_id: requestId,
      path: new URL(c.req.url).pathname,
      ip: c.req.header("CF-Connecting-IP"),
    });
    return createErrorResponse(c, "ACCESS_DENIED", "User context not found");
  }

  if (!user.is_admin) {
    await logEvent(
      c.env,
      "Admin access denied: Insufficient privileges",
      "warn",
      {
        request_id: requestId,
        path: new URL(c.req.url).pathname,
        user_id: user.id,
        username: user.username,
        ip: c.req.header("CF-Connecting-IP"),
      },
    );
    return createErrorResponse(c, "ADMIN_REQUIRED");
  }

  await next();
};

// Optional middleware for rate limiting (basic implementation)
export const rateLimit = (requests: number, windowMs: number) => {
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  return async (c: AuthContext, next: Next) => {
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, data] of rateLimitMap.entries()) {
      if (data.resetTime < windowStart) {
        rateLimitMap.delete(key);
      }
    }

    const current = rateLimitMap.get(ip) || {
      count: 0,
      resetTime: now + windowMs,
    };

    if (current.count >= requests && current.resetTime > now) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);

      await logEvent(c.env, "Rate limit exceeded", "warn", {
        ip,
        path: new URL(c.req.url).pathname,
        count: current.count,
        limit: requests,
      });

      const response = createErrorResponse(
        c,
        "QUOTA_EXCEEDED",
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      );
      response.headers.set("Retry-After", retryAfter.toString());
      response.headers.set("X-RateLimit-Limit", requests.toString());
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(current.resetTime / 1000).toString(),
      );

      return response;
    }

    current.count++;
    rateLimitMap.set(ip, current);

    await next();
  };
};
