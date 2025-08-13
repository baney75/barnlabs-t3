// src/utils/validation.ts
// Comprehensive validation utilities for the BARN Labs backend

import type {
  CreateUserRequest,
  UpdateUserRequest,
  LoginRequest,
} from "../types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Email validation with comprehensive regex
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || typeof email !== "string") {
    errors.push("Email is required");
    return { isValid: false, errors };
  }

  email = email.trim().toLowerCase();

  if (email.length === 0) {
    errors.push("Email cannot be empty");
  } else if (email.length > 254) {
    errors.push("Email is too long (max 254 characters)");
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    errors.push("Invalid email format");
  }

  // Check for common disposable email domains
  const disposableDomains = [
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "yopmail.com",
    "temp-mail.org",
    "throwaway.email",
  ];

  const domain = email.split("@")[1];
  if (domain && disposableDomains.includes(domain)) {
    errors.push("Disposable email addresses are not allowed");
  }

  return { isValid: errors.length === 0, errors };
}

// Username validation
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];

  if (!username || typeof username !== "string") {
    errors.push("Username is required");
    return { isValid: false, errors };
  }

  username = username.trim();

  if (username.length === 0) {
    errors.push("Username cannot be empty");
  } else if (username.length < 3) {
    errors.push("Username must be at least 3 characters long");
  } else if (username.length > 30) {
    errors.push("Username must be at most 30 characters long");
  }

  // Allow alphanumeric, underscore, hyphen, and dot
  const usernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!usernameRegex.test(username)) {
    errors.push(
      "Username can only contain letters, numbers, dots, underscores, and hyphens",
    );
  }

  // Cannot start or end with special characters
  if (/^[._-]|[._-]$/.test(username)) {
    errors.push("Username cannot start or end with special characters");
  }

  // Reserved usernames
  const reserved = [
    "admin",
    "administrator",
    "root",
    "system",
    "api",
    "www",
    "mail",
    "ftp",
    "blog",
    "support",
    "help",
    "info",
    "news",
    "test",
    "demo",
    "guest",
    "user",
    "null",
    "undefined",
    "true",
    "false",
  ];

  if (reserved.includes(username.toLowerCase())) {
    errors.push("This username is reserved and cannot be used");
  }

  return { isValid: errors.length === 0, errors };
}

// Enhanced password validation
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== "string") {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must be at most 128 characters long");
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

  // Check for common patterns
  const commonPatterns = [
    /(.)\1{3,}/, // 4+ repeated characters
    /123456/,
    /password/,
    /qwerty/,
    /letmein/,
    /welcome/,
    /admin/,
    /login/,
    /guest/,
    /test/,
  ];

  const lowerPassword = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (pattern.test(lowerPassword)) {
      errors.push("Password contains common patterns that are not secure");
      break;
    }
  }

  return { isValid: errors.length === 0, errors };
}

// File validation
export function validateFileName(filename: string): ValidationResult {
  const errors: string[] = [];

  if (!filename || typeof filename !== "string") {
    errors.push("Filename is required");
    return { isValid: false, errors };
  }

  filename = filename.trim();

  if (filename.length === 0) {
    errors.push("Filename cannot be empty");
  } else if (filename.length > 255) {
    errors.push("Filename is too long (max 255 characters)");
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) {
    errors.push("Filename contains invalid characters");
  }

  // Check for reserved names (Windows)
  const reservedNames = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];

  const baseName = filename.split(".")[0].toUpperCase();
  if (reservedNames.includes(baseName)) {
    errors.push("Filename uses a reserved system name");
  }

  return { isValid: errors.length === 0, errors };
}

// Login request validation
export function validateLoginRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("Invalid request data");
    return { isValid: false, errors };
  }

  const { identifier, email, password } = data;

  if (!identifier && !email) {
    errors.push("Either identifier or email is required");
  }

  if (identifier) {
    // Could be username or email
    if (identifier.includes("@")) {
      const emailValidation = validateEmail(identifier);
      if (!emailValidation.isValid) {
        errors.push(
          ...emailValidation.errors.map((e) => `Identifier ${e.toLowerCase()}`),
        );
      }
    } else {
      const usernameValidation = validateUsername(identifier);
      if (!usernameValidation.isValid) {
        errors.push(
          ...usernameValidation.errors.map(
            (e) => `Identifier ${e.toLowerCase()}`,
          ),
        );
      }
    }
  }

  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }
  }

  if (!password || typeof password !== "string" || password.length === 0) {
    errors.push("Password is required");
  }

  return { isValid: errors.length === 0, errors };
}

// User creation validation
export function validateCreateUserRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("Invalid request data");
    return { isValid: false, errors };
  }

  const { username, email, password } = data;

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.isValid) {
    errors.push(...usernameValidation.errors);
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }

  return { isValid: errors.length === 0, errors };
}

// User update validation
export function validateUpdateUserRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("Invalid request data");
    return { isValid: false, errors };
  }

  const { username, email, password, max_models, ai_instructions } = data;

  if (username !== undefined) {
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors);
    }
  }

  if (email !== undefined) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }
  }

  if (password !== undefined) {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (max_models !== undefined) {
    if (typeof max_models !== "number" || max_models < 0 || max_models > 1000) {
      errors.push("Max models must be a number between 0 and 1000");
    }
  }

  if (ai_instructions !== undefined) {
    if (typeof ai_instructions !== "string" || ai_instructions.length > 5000) {
      errors.push("AI instructions must be a string with max 5000 characters");
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Generic object validation helper
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[],
): ValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`${String(field)} is required`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Sanitization utilities
export function sanitizeString(
  input: string,
  maxLength: number = 1000,
): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Remove control characters
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

export function sanitizeUsername(username: string): string {
  if (typeof username !== "string") return "";
  return username.trim().toLowerCase();
}

// Rate limiting validation
export function validateRateLimit(
  current: number,
  limit: number,
  windowMs: number,
  resetTime: number,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  if (current >= limit && resetTime > now) {
    return {
      allowed: false,
      retryAfter: Math.ceil((resetTime - now) / 1000),
    };
  }

  return { allowed: true };
}
