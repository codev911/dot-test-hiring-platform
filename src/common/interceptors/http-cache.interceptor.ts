import { CacheInterceptor, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

function normaliseUrl(url: string): string {
  const [path, query] = url.split('?');
  if (!query) return path;
  const params = new URLSearchParams(query);
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const normalised = new URLSearchParams(entries);
  const qs = normalised.toString();
  return qs ? `${path}?${qs}` : path;
}

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  constructor(@Inject(CACHE_MANAGER) cacheManager: unknown, reflector: Reflector) {
    super(cacheManager, reflector);
  }

  protected isRequestCacheable(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: { sub?: string } }>();
    return request.method === 'GET';
  }

  protected trackBy(context: ExecutionContext): string | undefined {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: { sub?: string } }>();
    if (request.method !== 'GET') {
      return undefined;
    }

    const userId = request.user?.sub;
    const urlKey = normaliseUrl(request.originalUrl || request.url);

    return userId ? `u:${userId}|${urlKey}` : urlKey;
  }
}
