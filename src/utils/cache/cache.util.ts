import type { Env } from '../types/env.type';

/**
 * Build a stable cache key from a list of stringable segments.
 */
export function buildCacheKey(
  ...segments: Array<string | number | boolean | undefined | null>
): string {
  return segments
    .filter((v) => v !== undefined && v !== null && `${v}`.length > 0)
    .map((v) => `${v}`.trim())
    .join('|');
}

/**
 * Derive a Redis connection URL from the provided environment variables.
 * Prioritises REDIS_URL if present.
 */
export function resolveRedisUrl(env: Partial<Env>): string {
  if (env.REDIS_URL && env.REDIS_URL.trim().length > 0) {
    return env.REDIS_URL;
  }

  const host = env.REDIS_HOST ?? 'localhost';
  const port = env.REDIS_PORT ?? 6379;
  const db = env.REDIS_DB ?? 0;
  const password = env.REDIS_PASSWORD;

  const auth = password ? `:${encodeURIComponent(password)}@` : '';
  return `redis://${auth}${host}:${port}/${db}`;
}

/**
 * Default TTL to use when none is provided (in milliseconds).
 */
export function defaultTtlMs(env: Partial<Env>): number {
  return env.CACHE_TTL_MS ?? 60_000; // 60s default
}
