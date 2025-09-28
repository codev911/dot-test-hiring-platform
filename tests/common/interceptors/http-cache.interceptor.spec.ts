import { HttpStatus } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import { of } from 'rxjs';
import { HttpCacheInterceptor } from '../../../src/common/interceptors/http-cache.interceptor';

/**
 * Unit tests for HttpCacheInterceptor trackBy and isRequestCacheable behavior.
 */
describe('HttpCacheInterceptor', () => {
  const createContext = (
    method: string,
    url: string,
    user?: { sub?: string },
  ): ExecutionContext => {
    const request = { method, originalUrl: url, url, user } as any;
    const response = { statusCode: HttpStatus.OK } as Response;
    const handler = () => undefined;
    class Dummy {}
    return {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
      getHandler: () => handler,
      getClass: () => Dummy,
    } as unknown as ExecutionContext;
  };

  it('caches only GET requests', () => {
    const interceptor = new HttpCacheInterceptor({} as any, { get: () => null } as any);
    const ctxGet = createContext('GET', '/api/jobs');
    const ctxPost = createContext('POST', '/api/jobs');

    // @ts-expect-error - accessing protected method for test
    expect(interceptor.isRequestCacheable(ctxGet)).toBe(true);
    // @ts-expect-error - accessing protected method for test
    expect(interceptor.isRequestCacheable(ctxPost)).toBe(false);
  });

  it('produces deterministic keys with sorted query params', () => {
    const interceptor = new HttpCacheInterceptor({} as any, { get: () => null } as any);
    const ctxA = createContext('GET', '/api/jobs?b=2&a=1');
    const ctxB = createContext('GET', '/api/jobs?a=1&b=2');

    // @ts-expect-error - accessing protected method for test
    const keyA = interceptor.trackBy(ctxA);
    // @ts-expect-error - accessing protected method for test
    const keyB = interceptor.trackBy(ctxB);
    expect(keyA).toBe('/api/jobs?a=1&b=2');
    expect(keyB).toBe('/api/jobs?a=1&b=2');
  });

  it('includes user id for per-user cache segregation', () => {
    const interceptor = new HttpCacheInterceptor({} as any, { get: () => null } as any);
    const ctx = createContext('GET', '/api/me', { sub: 'u-1' });
    // @ts-expect-error - accessing protected method for test
    const key = interceptor.trackBy(ctx);
    expect(key).toBe('u:u-1|/api/me');
  });

  it('defers to base intercept for GET caching flow', async () => {
    const interceptor = new HttpCacheInterceptor({} as any, { get: () => null } as any);
    const ctx = createContext('GET', '/api/ping');
    const next: CallHandler = { handle: () => of({ pong: true }) };
    const result = await (interceptor as any).intercept(ctx, next);
    expect(result).toBeDefined();
  });
});
