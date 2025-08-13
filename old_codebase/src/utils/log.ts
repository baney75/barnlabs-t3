// src/utils/log.ts
import type { Env } from "../types";

export type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Structured log entry persisted in KV.
 * Keep this minimal but useful for debugging and analytics.
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  // Request context (when available)
  request_id?: string;
  route?: string;
  method?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  referrer?: string;
  // User context (if known)
  user_id?: number;
  username?: string;
  ip?: string;
  user_agent?: string;
  // Event-specific fields
  event?: string;
  src?: string; // e.g., model URL
  detail?: string; // free-form detail about the event
  asset_key?: string; // R2 key
  file_name?: string;
  file_type?: string;
  size?: number;
  mime?: string;
  error_code?: string;
  error?: string;
  content_length?: string;
}

export async function logEvent(
  env: Env,
  message: string,
  level: LogLevel = "info",
  metadata?: Partial<LogEntry>,
) {
  try {
    // Only log error and warn levels to KV to avoid hitting daily limits
    const shouldLogToKV = level === "error" || level === "warn";

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    if (shouldLogToKV) {
      const key = `log_${level}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      await env.LOGS.put(key, JSON.stringify(logEntry), {
        expirationTtl: getLogRetentionTime(level),
      });
    }

    // Always log to console for development
    console.log(
      `[${level.toUpperCase()}] ${message}`,
      metadata ? metadata : "",
    );
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Failed to log event:", error.message);
    // Don't throw here to avoid breaking the main flow
  }
}

// Helper functions for different log levels
export const logInfo = (
  env: Env,
  message: string,
  metadata?: Partial<LogEntry>,
) => logEvent(env, message, "info", metadata);

export const logWarn = (
  env: Env,
  message: string,
  metadata?: Partial<LogEntry>,
) => logEvent(env, message, "warn", metadata);

export const logError = (
  env: Env,
  message: string,
  metadata?: Partial<LogEntry>,
) => logEvent(env, message, "error", metadata);

export const logDebug = (
  env: Env,
  message: string,
  metadata?: Partial<LogEntry>,
) => logEvent(env, message, "debug", metadata);

// Get retention time based on log level
function getLogRetentionTime(level: LogLevel): number {
  switch (level) {
    case "error":
      return 7 * 24 * 60 * 60; // 7 days
    case "warn":
      return 3 * 24 * 60 * 60; // 3 days
    case "info":
      return 24 * 60 * 60; // 1 day
    case "debug":
      return 6 * 60 * 60; // 6 hours
    default:
      return 24 * 60 * 60; // 1 day
  }
}

// Batch log retrieval with filtering
export async function getLogs(
  env: Env,
  options: {
    limit?: number;
    level?: LogLevel;
    startTime?: string;
    endTime?: string;
  } = {},
): Promise<LogEntry[]> {
  try {
    const { limit = 50, level, startTime, endTime } = options;

    let prefix = "log_";
    if (level) {
      prefix = `log_${level}_`;
    }

    const list = await env.LOGS.list({ prefix, limit: Math.min(limit, 1000) });
    const logs = await Promise.all(
      list.keys.map(async (key) => {
        try {
          const logData = await env.LOGS.get(key.name);
          return logData ? (JSON.parse(logData) as LogEntry) : null;
        } catch {
          return null;
        }
      }),
    );

    let filteredLogs = logs.filter((log): log is LogEntry => log !== null);

    // Apply time filters
    if (startTime) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= startTime);
    }
    if (endTime) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp <= endTime);
    }

    // Sort by timestamp (most recent first)
    filteredLogs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return filteredLogs.slice(0, limit);
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Failed to retrieve logs:", error.message);
    return [];
  }
}

export async function clearLogs(env: Env, level?: LogLevel): Promise<number> {
  const prefix = level ? `log_${level}_` : "log_";
  const list = await env.LOGS.list({ prefix, limit: 1000 });
  let deleted = 0;
  for (const key of list.keys) {
    try {
      await env.LOGS.delete(key.name);
      deleted += 1;
    } catch {
      // ignore
    }
  }
  return deleted;
}
