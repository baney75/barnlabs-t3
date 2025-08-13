// src/utils/cache.ts
// Caching utilities for improved performance

import type { Env } from "../types";

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache namespace prefix
}

// In-memory cache for short-lived data (per-isolate)
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Maximum number of entries

  set<T>(key: string, value: T, ttl: number = 300): void {
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // If still full after cleanup, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Global memory cache instance
const memoryCache = new MemoryCache();

// KV-based persistent cache
export class KVCache {
  constructor(
    private kv: KVNamespace,
    private defaultTtl: number = 3600, // 1 hour default
  ) {}

  private formatKey(key: string, namespace?: string): string {
    const prefix = namespace ? `cache:${namespace}:` : "cache:";
    return `${prefix}${key}`;
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const formattedKey = this.formatKey(key, options.namespace);
      const cached = await this.kv.get(formattedKey, "json");
      return cached as T | null;
    } catch (error) {
      console.error("KV cache get error:", error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const formattedKey = this.formatKey(key, options.namespace);
      const ttl = options.ttl || this.defaultTtl;

      await this.kv.put(formattedKey, JSON.stringify(value), {
        expirationTtl: ttl,
      });
    } catch (error) {
      console.error("KV cache set error:", error);
      // Don't throw, caching failures shouldn't break the app
    }
  }

  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    try {
      const formattedKey = this.formatKey(key, options.namespace);
      await this.kv.delete(formattedKey);
    } catch (error) {
      console.error("KV cache delete error:", error);
    }
  }

  async clear(namespace?: string): Promise<void> {
    try {
      const prefix = this.formatKey("", namespace);
      const list = await this.kv.list({ prefix });

      const deletions = list.keys.map((key) => this.kv.delete(key.name));
      await Promise.all(deletions);
    } catch (error) {
      console.error("KV cache clear error:", error);
    }
  }
}

// Cache helper functions
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(":");
}

export function getMemoryCache(): MemoryCache {
  return memoryCache;
}

export function createKVCache(env: Env): KVCache {
  return new KVCache(env.LOGS); // Reuse LOGS KV for caching
}

// Memoization decorator for functions
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl: number = 300,
): T {
  const cache = getMemoryCache();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    const cacheKey = `memo:${fn.name}:${key}`;

    let cached = cache.get<ReturnType<T>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    cache.set(cacheKey, result, ttl);
    return result;
  }) as T;
}

// Async memoization for database operations
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl: number = 300,
): T {
  const cache = getMemoryCache();

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    const cacheKey = `async-memo:${fn.name}:${key}`;

    let cached = cache.get<Awaited<ReturnType<T>>>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = await fn(...args);
    cache.set(cacheKey, result, ttl);
    return result;
  }) as T;
}

// Cache invalidation patterns
export function invalidatePattern(pattern: string): void {
  const cache = getMemoryCache();
  // Simple pattern matching for memory cache
  // In a production system, you might want more sophisticated pattern matching
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    // Note: MemoryCache doesn't expose keys(), so we'd need to modify it
    // For now, we'll just clear the entire cache
    cache.clear();
  } else {
    cache.delete(pattern);
  }
}

// HTTP cache headers helper
export function getCacheHeaders(
  maxAge: number,
  isPublic: boolean = false,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${maxAge}`,
  };

  if (maxAge > 0) {
    headers["Expires"] = new Date(Date.now() + maxAge * 1000).toUTCString();
  }

  return headers;
}

// Cache warming utilities
export async function warmCache(env: Env): Promise<void> {
  const kvCache = createKVCache(env);

  try {
    // Pre-populate frequently accessed data
    // This would typically be called during application startup

    // Example: Cache database stats
    // const stats = await getDatabaseStats(env.DB);
    // await kvCache.set("db:stats", stats, { ttl: 300 });

    console.log("Cache warming completed");
  } catch (error) {
    console.error("Cache warming failed:", error);
  }
}

// Cache metrics and monitoring
export interface CacheMetrics {
  memoryCache: {
    size: number;
    hits: number;
    misses: number;
  };
}

let cacheMetrics: CacheMetrics = {
  memoryCache: {
    size: 0,
    hits: 0,
    misses: 0,
  },
};

export function getCacheMetrics(): CacheMetrics {
  cacheMetrics.memoryCache.size = memoryCache.size();
  return { ...cacheMetrics };
}

export function incrementCacheHit(): void {
  cacheMetrics.memoryCache.hits++;
}

export function incrementCacheMiss(): void {
  cacheMetrics.memoryCache.misses++;
}
