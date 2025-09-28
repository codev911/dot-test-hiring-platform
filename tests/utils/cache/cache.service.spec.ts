import { CacheHelperService } from '../../../src/utils/cache/cache.service';

describe('CacheHelperService', () => {
  it('getOrSet stores and returns value', async () => {
    const store = new Map<string, any>();
    const cache: any = {
      get: jest.fn((k: string) => store.get(k)),
      set: jest.fn((k: string, v: any) => store.set(k, v)),
      del: jest.fn((k: string) => store.delete(k)),
    };

    const svc = new CacheHelperService(cache);
    const key = 'key';
    const value = await svc.getOrSet(key, () => Promise.resolve(42));
    expect(value).toBe(42);
    expect(await svc.getOrSet(key, () => Promise.resolve(99))).toBe(42);

    await svc.del(key);
    expect(store.has(key)).toBe(false);
  });
});
