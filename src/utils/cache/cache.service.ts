import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheHelperService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Fetch a value from cache by key; if missing, resolve the supplier and cache the result.
   *
   * @param key Unique cache key.
   * @param ttlMs Time to live in milliseconds (fallback to global TTL when omitted).
   * @param supplier Function producing the value on cache miss.
   */
  async getOrSet<T>(key: string, supplier: () => Promise<T>, ttlMs?: number): Promise<T> {
    const existing = await this.cache.get<T>(key);
    if (existing !== undefined && existing !== null) {
      return existing as T;
    }

    const value = await supplier();

    // ttlMs semantics:
    // - ttlMs > 0 => set with finite TTL
    // - ttlMs === 0 => set with 0 to indicate no-expiry (overrides global default)
    // - ttlMs === undefined => defer to global default TTL
    if (ttlMs === 0) {
      await this.cache.set(key, value, 0 as unknown as number);
    } else if (ttlMs && ttlMs > 0) {
      await this.cache.set(key, value, ttlMs);
    } else {
      await this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Remove a specific cache key.
   */
  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
