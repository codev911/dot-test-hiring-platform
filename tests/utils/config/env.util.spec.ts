import type { ConfigService } from '@nestjs/config';
import { collectEnv } from '../../../src/utils/config/env.util';
import { NodeEnv } from '../../../src/utils/enums/node-env.enum';
import type { Env } from '../../../src/utils/types/env.type';

describe('collectEnv', () => {
  it('retrieves typed environment values from ConfigService', () => {
    const entries: Record<string, unknown> = {
      NODE_ENV: NodeEnv.Production,
      PORT: 8080,
      MYSQL_HOST: 'db-host',
      MYSQL_PORT: 3306,
      MYSQL_USER: 'db-user',
      MYSQL_PASSWORD: 'db-pass',
      MYSQL_DATABASE: 'db-name',
      MYSQL_LOGGING: true,
      JWT_SECRET: 'jwt-secret',
      JWT_EXPIRES_IN: '1h',
      MINIO_ENDPOINT: 'http://localhost:9000',
      MINIO_ACCESS_KEY: 'access',
      MINIO_SECRET_KEY: 'secret',
      MINIO_BUCKET: 'bucket',
    };

    const getOrThrow = jest.fn((key: string) => {
      if (!(key in entries)) {
        throw new Error(`Unexpected key ${key}`);
      }

      if (key === 'MYSQL_LOGGING') {
        throw new Error('MYSQL_LOGGING should use get, not getOrThrow');
      }

      return entries[key];
    });

    const get = jest.fn((key: string) => {
      if (key === 'MYSQL_LOGGING') {
        return entries[key];
      }

      return undefined;
    });

    const configService = {
      getOrThrow,
      get,
    } as unknown as ConfigService<Env>;

    const result = collectEnv(configService);

    expect(result).toEqual(entries);
    expect(get).toHaveBeenCalledWith('MYSQL_LOGGING');
    Object.keys(entries)
      .filter((key) => key !== 'MYSQL_LOGGING')
      .forEach((key) => {
        expect(getOrThrow).toHaveBeenCalledWith(key);
      });
  });

  it('defaults MYSQL_LOGGING to false when not provided', () => {
    const entries: Record<string, unknown> = {
      NODE_ENV: NodeEnv.Development,
      PORT: 3000,
      MYSQL_HOST: 'localhost',
      MYSQL_PORT: 3306,
      MYSQL_USER: 'root',
      MYSQL_PASSWORD: 'pass',
      MYSQL_DATABASE: 'db',
      JWT_SECRET: 'secret',
      JWT_EXPIRES_IN: '1h',
      MINIO_ENDPOINT: 'http://localhost:9000',
      MINIO_ACCESS_KEY: 'acc',
      MINIO_SECRET_KEY: 'sec',
      MINIO_BUCKET: 'bucket',
    };

    const getOrThrow = jest.fn((key: string) => entries[key]);
    const get = jest.fn((key: string) => (key === 'MYSQL_LOGGING' ? undefined : undefined));

    const configService = { getOrThrow, get } as unknown as ConfigService<Env>;
    const result = collectEnv(configService);

    expect(result.MYSQL_LOGGING).toBe(false);
  });
});
