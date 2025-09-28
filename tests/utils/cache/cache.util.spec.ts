import {
  buildCacheKey,
  resolveRedisUrl,
  defaultTtlMs,
  buildHttpCacheKeyForUserPath,
} from '../../../src/utils/cache/cache.util';

describe('cache.util', () => {
  describe('buildCacheKey', () => {
    it('composes and trims parts', () => {
      expect(buildCacheKey('a', undefined, ' b ', 1, false, null)).toBe('a|b|1|false');
    });

    it('handles empty strings', () => {
      expect(buildCacheKey('a', '', 'b')).toBe('a|b');
    });

    it('handles all falsy values', () => {
      expect(buildCacheKey(undefined, null, '', 0, false)).toBe('0|false');
    });
  });

  describe('resolveRedisUrl', () => {
    it('prefers REDIS_URL', () => {
      expect(resolveRedisUrl({ REDIS_URL: 'redis://localhost:6379/0' } as any)).toBe(
        'redis://localhost:6379/0',
      );
    });

    it('builds from parts', () => {
      expect(
        resolveRedisUrl({ REDIS_HOST: '127.0.0.1', REDIS_PORT: 6380, REDIS_DB: 2 } as any),
      ).toBe('redis://127.0.0.1:6380/2');
    });

    it('uses defaults when parts are missing', () => {
      expect(resolveRedisUrl({} as any)).toBe('redis://localhost:6379/0');
    });

    it('includes password when provided', () => {
      expect(resolveRedisUrl({ REDIS_PASSWORD: 'secret123' } as any)).toBe(
        'redis://:secret123@localhost:6379/0',
      );
    });

    it('encodes password with special characters', () => {
      expect(resolveRedisUrl({ REDIS_PASSWORD: 'p@ssw:rd!' } as any)).toBe(
        'redis://:p%40ssw%3Ard!@localhost:6379/0',
      );
    });

    it('ignores empty REDIS_URL', () => {
      expect(resolveRedisUrl({ REDIS_URL: '  ' } as any)).toBe('redis://localhost:6379/0');
    });
  });

  describe('defaultTtlMs', () => {
    it('returns env TTL or default', () => {
      expect(defaultTtlMs({ CACHE_TTL_MS: 12345 } as any)).toBe(12345);
      expect(defaultTtlMs({} as any)).toBe(60000);
    });
  });

  describe('buildHttpCacheKeyForUserPath', () => {
    it('builds key without user', () => {
      expect(buildHttpCacheKeyForUserPath(undefined, '/api/test')).toBe('/api/test');
    });

    it('builds key with user', () => {
      expect(buildHttpCacheKeyForUserPath('user123', '/api/test')).toBe('u:user123|/api/test');
    });

    it('normalizes path with query parameters', () => {
      expect(buildHttpCacheKeyForUserPath('user123', '/api/test?old=param')).toBe(
        'u:user123|/api/test',
      );
    });

    it('handles query object with simple values', () => {
      const query = { name: 'test', page: 1, active: true };
      expect(buildHttpCacheKeyForUserPath('user123', '/api/users', query)).toBe(
        'u:user123|/api/users?active=true&name=test&page=1',
      );
    });

    it('handles query object with mixed value types', () => {
      const query = { name: 'test', count: 42, active: true, flag: false };
      expect(buildHttpCacheKeyForUserPath('user123', '/api/posts', query)).toBe(
        'u:user123|/api/posts?active=true&count=42&flag=false&name=test',
      );
    });

    it('filters out undefined and null query values', () => {
      const query = { name: 'test', empty: undefined, nullValue: null, page: 1 };
      expect(buildHttpCacheKeyForUserPath('user123', '/api/test', query)).toBe(
        'u:user123|/api/test?name=test&page=1',
      );
    });

    it('handles empty query object', () => {
      expect(buildHttpCacheKeyForUserPath('user123', '/api/test', {})).toBe('u:user123|/api/test');
    });

    it('sorts query parameters for deterministic output', () => {
      const query = { z: 'last', a: 'first', m: 'middle' };
      expect(buildHttpCacheKeyForUserPath('user123', '/api/test', query)).toBe(
        'u:user123|/api/test?a=first&m=middle&z=last',
      );
    });

    it('handles query with all parameters filtered out', () => {
      const query = { empty: undefined, nullValue: null };
      expect(buildHttpCacheKeyForUserPath('user123', '/api/test', query)).toBe(
        'u:user123|/api/test',
      );
    });
  });
});
