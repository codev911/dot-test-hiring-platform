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

/**
 * Build the same HTTP cache key used by HttpCacheInterceptor for a given user and path.
 * Provide query as a plain object to be normalized and sorted.
 */
export function buildHttpCacheKeyForUserPath(
  userId: string | undefined,
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedPath = path.includes('?') ? path.split('?')[0] : path;
  let urlKey = normalizedPath;

  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams();
    const entries = Object.entries(query).filter(([, v]) => v !== undefined && v !== null);

    for (const [k, v] of entries) {
      if (Array.isArray(v)) {
        for (const item of v) params.append(k, String(item));
      } else {
        params.append(k, String(v));
      }
    }

    // sort for deterministic order
    const sorted = new URLSearchParams(
      Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)),
    );
    const qs = sorted.toString();
    urlKey = qs ? `${normalizedPath}?${qs}` : normalizedPath;
  }

  return userId ? `u:${userId}|${urlKey}` : urlKey;
}
