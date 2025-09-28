import type { DataSource, EntityManager } from 'typeorm';

/**
 * Execute database operations inside an explicit transaction using a QueryRunner.
 * Falls back to non-transactional execution when the data source is unavailable
 * (e.g., during unit tests with mocked repositories).
 *
 * @param dataSource Optional TypeORM DataSource. When provided, a QueryRunner is used.
 * @param run Callback that receives the transactional EntityManager.
 * @returns The value returned by the callback.
 */
export async function withTransaction<T>(
  dataSource: DataSource | undefined,
  run: (manager?: EntityManager) => Promise<T>,
): Promise<T> {
  if (!dataSource) {
    return run(undefined);
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await run(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    try {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
    throw error;
  } finally {
    if (!queryRunner.isReleased) {
      await queryRunner.release();
    }
  }
}
