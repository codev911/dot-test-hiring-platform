import { buildCacheKey, resolveRedisUrl, defaultTtlMs } from '../../../src/utils/cache/cache.util';

describe('cache.util', () => {
  it('buildCacheKey composes and trims parts', () => {
    expect(buildCacheKey('a', undefined, ' b ', 1, false, null)).toBe('a|b|1|false');
  });

  it('resolveRedisUrl prefers REDIS_URL', () => {
    expect(resolveRedisUrl({ REDIS_URL: 'redis://localhost:6379/0' } as any)).toBe(
      'redis://localhost:6379/0',
    );
  });

  it('resolveRedisUrl builds from parts', () => {
    expect(resolveRedisUrl({ REDIS_HOST: '127.0.0.1', REDIS_PORT: 6380, REDIS_DB: 2 } as any)).toBe(
      'redis://127.0.0.1:6380/2',
    );
  });

  it('defaultTtlMs returns env TTL or default', () => {
    expect(defaultTtlMs({ CACHE_TTL_MS: 12345 } as any)).toBe(12345);
    expect(defaultTtlMs({} as any)).toBe(60000);
  });
});
