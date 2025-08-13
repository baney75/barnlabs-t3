/**
 * Utility functions to safely access environment variables in both
 * Cloudflare Workers (bindings) and Node.js processes.
 */

export interface EnvBinding {
  [key: string]: unknown;
}

function isWorkerEnv(env: any): env is EnvBinding {
  return env && typeof env === "object" && !(env instanceof Node);
}

/**
 * Read an environment value. If running inside Cloudflare Worker, it expects
 * the value on the provided bindings object, falling back to process.env.
 */
export function readEnv(
  name: string,
  bindings?: EnvBinding,
  fallback: string | undefined = undefined,
): string | undefined {
  if (bindings && isWorkerEnv(bindings) && typeof bindings[name] === "string") {
    return (bindings[name] as string).trim();
  }
  if (typeof process !== "undefined" && process.env) {
    const val = process.env[name];
    return val ? val.trim() : fallback;
  }
  return fallback;
}
