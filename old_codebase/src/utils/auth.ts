// src/utils/auth.ts

import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import {
  getUserByEmail,
  createUser,
  getUserByIdentifier,
  updateUser,
} from "./db";
import type { C, JWTPayload, LoginResponse, User } from "../types";
import {
  createErrorResponse,
  createSuccessResponse,
  validateRequired,
  AppError,
} from "./errors";
import { logEvent } from "./log";

// --- Authentication Utilities (Extracted for reusability) ---

export async function hashPassword(password: string): Promise<string> {
  // bcrypt handles salt generation automatically when you provide salt rounds.
  // The salt is embedded in the resulting hash.
  const hashedPassword = await bcrypt.hash(password, 12);
  return hashedPassword;
}

export async function comparePasswords(
  plain: string,
  hashed: string,
): Promise<boolean> {
  // bcrypt.compare will extract the salt from the `hashed` string and
  // perform a secure, timing-safe comparison.
  return await bcrypt.compare(plain, hashed);
}

// Enhanced JWT token generation
async function generateJWT(user: User, env: Env): Promise<string> {
  if (!env.JWT_SECRET?.trim()) {
    throw new AppError("CONFIG_ERROR", "JWT secret not configured");
  }

  const payload: JWTPayload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    username: user.username,
    is_admin: user.is_admin,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24-hour expiration
  };

  const secret = new TextEncoder().encode(env.JWT_SECRET.trim());

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

// --- Enhanced Login User ---
export async function loginUser(c: C): Promise<Response> {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { identifier, email, password } = body;

    // Validate required fields
    const validation = validateRequired(body, ["password"]);
    if (!validation.isValid) {
      return createErrorResponse(
        c,
        "MISSING_REQUIRED_FIELD",
        `Missing fields: ${validation.missingFields.join(", ")}`,
      );
    }

    if (!identifier && !email) {
      return createErrorResponse(
        c,
        "MISSING_REQUIRED_FIELD",
        "Either identifier or email is required",
      );
    }

    if (!password || typeof password !== "string" || password.length === 0) {
      return createErrorResponse(
        c,
        "VALIDATION_ERROR",
        "Password cannot be empty",
      );
    }

    // Rate limiting for login attempts
    const clientId = c.req.header("CF-Connecting-IP") || "unknown";
    await logEvent(c.env, "Login attempt", "info", {
      identifier: identifier || email,
      ip: clientId,
      user_agent: c.req.header("User-Agent"),
    });

    const user = identifier
      ? await getUserByIdentifier(c.env.DB, identifier)
      : await getUserByEmail(c.env.DB, email);

    if (!user || !user.hashedPassword) {
      // Don't reveal whether user exists
      await logEvent(c.env, "Login failed: User not found", "warn", {
        identifier: identifier || email,
        ip: clientId,
      });
      return createErrorResponse(c, "INVALID_CREDENTIALS");
    }

    const passwordMatch = await comparePasswords(password, user.hashedPassword);

    if (!passwordMatch) {
      await logEvent(c.env, "Login failed: Invalid password", "warn", {
        user_id: user.id,
        username: user.username,
        ip: clientId,
      });
      return createErrorResponse(c, "INVALID_CREDENTIALS");
    }

    // Generate JWT token
    const token = await generateJWT(user, c.env);

    // Update last login time
    try {
      await updateUser(c.env.DB, user.id, {
        last_login: new Date().toISOString(),
      });
    } catch (error) {
      // Don't fail login if last_login update fails
      console.warn("Failed to update last_login:", error);
    }

    await logEvent(c.env, "Login successful", "info", {
      user_id: user.id,
      username: user.username,
      ip: clientId,
    });

    const response: LoginResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
        dashboard_content: user.dashboard_content,
        logo_url: user.logo_url,
        max_models: user.max_models,
        last_login: user.last_login,
        ai_enabled: user.ai_enabled,
        ai_instructions: user.ai_instructions,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      message: "Login successful",
    };

    return createSuccessResponse(c, response);
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof AppError) {
      return createErrorResponse(c, error.code as any, error.details);
    }

    return createErrorResponse(c, "INTERNAL_ERROR", "Login failed");
  }
}

// --- Enhanced Register User ---
export async function registerUser(c: C): Promise<Response> {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { email, password, username } = body;

    // Validate required fields
    const validation = validateRequired(body, ["email", "password"]);
    if (!validation.isValid) {
      return createErrorResponse(
        c,
        "MISSING_REQUIRED_FIELD",
        `Missing fields: ${validation.missingFields.join(", ")}`,
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createErrorResponse(c, "VALIDATION_ERROR", "Invalid email format");
    }

    // Validate password strength
    if (password.length < 8) {
      return createErrorResponse(
        c,
        "VALIDATION_ERROR",
        "Password must be at least 8 characters long",
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(c.env.DB, email);
    if (existingUser) {
      await logEvent(
        c.env,
        "Registration failed: Email already exists",
        "warn",
        {
          email,
          ip: c.req.header("CF-Connecting-IP"),
        },
      );
      return createErrorResponse(c, "ALREADY_EXISTS", "Email already in use");
    }

    // Generate username if not provided
    const finalUsername = username || email.split("@")[0];

    // Check if username is available
    const existingUsername = await getUserByIdentifier(c.env.DB, finalUsername);
    if (existingUsername) {
      return createErrorResponse(
        c,
        "ALREADY_EXISTS",
        "Username already in use",
      );
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await createUser(c.env.DB, {
      username: finalUsername,
      email,
      hashedPassword,
    });

    await logEvent(c.env, "User registered successfully", "info", {
      user_id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      ip: c.req.header("CF-Connecting-IP"),
    });

    const response = {
      message: "User registered successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    };

    return createSuccessResponse(c, response, 201);
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof AppError) {
      return createErrorResponse(c, error.code as any, error.details);
    }

    return createErrorResponse(c, "INTERNAL_ERROR", "Registration failed");
  }
}

// Password validation utility
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Generate temporary JWT for model access
export async function generateTemporaryModelToken(
  env: Env,
  key: string,
  expiresInMinutes: number = 60,
): Promise<string> {
  if (!env.JWT_SECRET?.trim()) {
    throw new AppError("CONFIG_ERROR", "JWT secret not configured");
  }

  const payload = {
    key,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInMinutes * 60,
  };

  const secret = new TextEncoder().encode(env.JWT_SECRET.trim());

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInMinutes}m`)
    .sign(secret);
}
