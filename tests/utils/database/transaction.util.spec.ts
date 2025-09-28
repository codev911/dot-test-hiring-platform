import type { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { withTransaction } from '../../../src/utils/database/transaction.util';

describe('withTransaction', () => {
  const makeQueryRunner = () => {
    const manager = {} as unknown as EntityManager;
    const qr: Partial<QueryRunner> & { calls: string[]; released: boolean } = {
      manager,
      isReleased: false,
      released: false,
      calls: [],
      connect: jest.fn().mockImplementation(function (this: any) {
        (this.calls as string[]).push('connect');
        return Promise.resolve();
      }),
      startTransaction: jest.fn().mockImplementation(function (this: any) {
        (this.calls as string[]).push('start');
        return Promise.resolve();
      }),
      commitTransaction: jest.fn().mockImplementation(function (this: any) {
        (this.calls as string[]).push('commit');
        return Promise.resolve();
      }),
      rollbackTransaction: jest.fn().mockImplementation(function (this: any) {
        (this.calls as string[]).push('rollback');
        return Promise.resolve();
      }),
      release: jest.fn().mockImplementation(function (this: any) {
        (this.calls as string[]).push('release');
        (this as any).isReleased = true;
        (this as any).released = true;
        return Promise.resolve();
      }),
    };
    return qr as unknown as QueryRunner & { calls: string[]; released: boolean };
  };

  const makeDataSource = (qr: QueryRunner): DataSource => {
    return {
      createQueryRunner: jest.fn().mockReturnValue(qr),
    } as unknown as DataSource;
  };

  it('executes callback within transaction and commits on success', async () => {
    const qr = makeQueryRunner();
    const ds = makeDataSource(qr);

    const result = await withTransaction(ds, async (em) => {
      expect(em).toBe(qr.manager);
      return Promise.resolve(42);
    });

    expect(result).toBe(42);
    expect((qr as any).calls).toEqual(['connect', 'start', 'commit', 'release']);
    expect(qr.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and releases on error', async () => {
    const qr = makeQueryRunner();
    const ds = makeDataSource(qr);

    await expect(
      withTransaction(ds, async () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');

    expect((qr as any).calls).toEqual(['connect', 'start', 'rollback', 'release']);
    expect(qr.release).toHaveBeenCalledTimes(1);
  });

  it('falls back to non-transactional execution when dataSource is undefined', async () => {
    const result = await withTransaction(undefined, async (em) => {
      expect(em).toBeUndefined();
      return Promise.resolve('ok');
    });
    expect(result).toBe('ok');
  });
});
