// src/utils/errors.ts
import type { Context } from "hono";
import type { Env, Variables, ApiError, ApiResponse } from "../types";
import { logError } from "./log";

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

// Standard HTTP error codes with descriptions
export const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: {
    code: "INVALID_CREDENTIALS",
    status: 401,
    message: "Invalid credentials provided",
  },
  TOKEN_EXPIRED: {
    code: "TOKEN_EXPIRED",
    status: 401,
    message: "Authentication token has expired",
  },
  TOKEN_INVALID: {
    code: "TOKEN_INVALID",
    status: 401,
    message: "Invalid authentication token",
  },
  ACCESS_DENIED: {
    code: "ACCESS_DENIED",
    status: 403,
    message: "Access denied",
  },
  ADMIN_REQUIRED: {
    code: "ADMIN_REQUIRED",
    status: 403,
    message: "Administrator privileges required",
  },

  // Validation Errors
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    status: 400,
    message: "Request validation failed",
  },
  MISSING_REQUIRED_FIELD: {
    code: "MISSING_REQUIRED_FIELD",
    status: 400,
    message: "Required field is missing",
  },
  INVALID_FORMAT: {
    code: "INVALID_FORMAT",
    status: 400,
    message: "Invalid data format",
  },
  FILE_TOO_LARGE: {
    code: "FILE_TOO_LARGE",
    status: 413,
    message: "File size exceeds limit",
  },

  // Resource Errors
  NOT_FOUND: { code: "NOT_FOUND", status: 404, message: "Resource not found" },
  ALREADY_EXISTS: {
    code: "ALREADY_EXISTS",
    status: 409,
    message: "Resource already exists",
  },
  QUOTA_EXCEEDED: {
    code: "QUOTA_EXCEEDED",
    status: 429,
    message: "Quota exceeded",
  },

  // Server Errors
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    status: 500,
    message: "Internal server error",
  },
  DATABASE_ERROR: {
    code: "DATABASE_ERROR",
    status: 500,
    message: "Database operation failed",
  },
  EXTERNAL_SERVICE_ERROR: {
    code: "EXTERNAL_SERVICE_ERROR",
    status: 502,
    message: "External service error",
  },

  // Setup & Configuration
  SETUP_REQUIRED: {
    code: "SETUP_REQUIRED",
    status: 400,
    message: "Application setup required",
  },
  SETUP_COMPLETED: {
    code: "SETUP_COMPLETED",
    status: 400,
    message: "Setup already completed",
  },
  CONFIG_ERROR: {
    code: "CONFIG_ERROR",
    status: 500,
    message: "Server configuration error",
  },
} as const;

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: string;
  public readonly requestId?: string;

  constructor(
    errorCode: keyof typeof ERROR_CODES,
    details?: string,
    requestId?: string,
  ) {
    const errorDef = ERROR_CODES[errorCode];
    super(errorDef.message);

    this.name = "AppError";
    this.code = errorDef.code;
    this.status = errorDef.status;
    this.details = details;
    this.requestId = requestId;
  }
}

// Helper function to create standard error responses
export function createErrorResponse(
  c: AppContext,
  errorCode: keyof typeof ERROR_CODES,
  details?: string,
): Response {
  const errorDef = ERROR_CODES[errorCode];
  const requestId = c.req.header("X-Request-Id") || crypto.randomUUID();

  const errorResponse: ApiError = {
    error: errorDef.message,
    code: errorDef.code,
    details,
    timestamp: new Date().toISOString(),
    requestId,
  };

  // Log error for debugging
  logError(c.env, `API Error: ${errorDef.message}`, {
    request_id: requestId,
    error_code: errorDef.code,
    status: errorDef.status,
    details,
    path: new URL(c.req.url).pathname,
    method: c.req.method,
    user_id: c.get("user")?.id,
  });

  return c.json(errorResponse, errorDef.status);
}

// Helper function to create success responses
export function createSuccessResponse<T>(
  c: AppContext,
  data: T,
  status: number = 200,
): Response {
  const requestId = c.req.header("X-Request-Id") || crypto.randomUUID();

  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return c.json(response, status);
}

// Async error handler wrapper
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    const c = args[0] as AppContext;

    try {
      return await handler(...args);
    } catch (error) {
      console.error("Unhandled error in route handler:", error);

      if (error instanceof AppError) {
        return createErrorResponse(
          c,
          error.code as keyof typeof ERROR_CODES,
          error.details,
        );
      }

      // For unknown errors, return generic internal error
      return createErrorResponse(
        c,
        "INTERNAL_ERROR",
        process.env.NODE_ENV === "development"
          ? (error as Error).message
          : undefined,
      );
    }
  };
}

// Validation helper
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[],
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(
    (field) =>
      data[field] === undefined || data[field] === null || data[field] === "",
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

// Database error handler
export function handleDatabaseError(error: unknown, operation: string): never {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown database error";
  console.error(`Database error during ${operation}:`, errorMessage);
  throw new AppError(
    "DATABASE_ERROR",
    `Failed to ${operation}: ${errorMessage}`,
  );
}

// Rate limiting error
export function createRateLimitResponse(
  c: AppContext,
  retryAfter?: number,
): Response {
  const response = createErrorResponse(
    c,
    "QUOTA_EXCEEDED",
    "Rate limit exceeded",
  );

  if (retryAfter) {
    response.headers.set("Retry-After", retryAfter.toString());
  }

  return response;
}
