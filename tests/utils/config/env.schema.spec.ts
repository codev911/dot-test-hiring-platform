import { configModuleOptions, validateEnv } from '../../../src/utils/config/env.schema';
import { NodeEnv } from '../../../src/utils/enums/node-env.enum';

describe('validateEnv', () => {
  const baseConfig = {
    MYSQL_HOST: 'localhost',
    MYSQL_PORT: 3306,
    MYSQL_USER: 'root',
    MYSQL_PASSWORD: 'password',
    MYSQL_DATABASE: 'test_db',
    JWT_SECRET: 'secret',
    JWT_EXPIRES_IN: '1h',
    MINIO_ENDPOINT: 'http://localhost:9000',
    MINIO_ACCESS_KEY: 'access',
    MINIO_SECRET_KEY: 'secret',
    MINIO_BUCKET: 'bucket',
  };

  it('returns defaults for optional values and coercions for supplied ones', () => {
    const result = validateEnv({
      ...baseConfig,
      MYSQL_LOGGING: false,
    });

    expect(result).toEqual({
      NODE_ENV: NodeEnv.Development,
      PORT: 3000,
      MYSQL_HOST: 'localhost',
      MYSQL_PORT: 3306,
      MYSQL_USER: 'root',
      MYSQL_PASSWORD: 'password',
      MYSQL_DATABASE: 'test_db',
      MYSQL_LOGGING: false,
      JWT_SECRET: 'secret',
      JWT_EXPIRES_IN: '1h',
      MINIO_ENDPOINT: 'http://localhost:9000',
      MINIO_ACCESS_KEY: 'access',
      MINIO_SECRET_KEY: 'secret',
      MINIO_BUCKET: 'bucket',
      REDIS_URL: undefined,
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: undefined,
      REDIS_DB: 0,
      CACHE_TTL_MS: 60000,
    });
  });

  it('parses provided values and coerces types', () => {
    const result = validateEnv({
      NODE_ENV: NodeEnv.Test,
      PORT: '5001',
      MYSQL_HOST: 'db',
      MYSQL_PORT: '3307',
      MYSQL_USER: 'admin',
      MYSQL_PASSWORD: 'admin_pw',
      MYSQL_DATABASE: 'prod_db',
      MYSQL_LOGGING: 'true',
      JWT_SECRET: 'jwt-secret',
      JWT_EXPIRES_IN: '2h',
      MINIO_ENDPOINT: 'http://minio',
      MINIO_ACCESS_KEY: 'access2',
      MINIO_SECRET_KEY: 'secret2',
      MINIO_BUCKET: 'bucket2',
    });

    expect(result).toEqual({
      NODE_ENV: NodeEnv.Test,
      PORT: 5001,
      MYSQL_HOST: 'db',
      MYSQL_PORT: 3307,
      MYSQL_USER: 'admin',
      MYSQL_PASSWORD: 'admin_pw',
      MYSQL_DATABASE: 'prod_db',
      MYSQL_LOGGING: true,
      JWT_SECRET: 'jwt-secret',
      JWT_EXPIRES_IN: '2h',
      MINIO_ENDPOINT: 'http://minio',
      MINIO_ACCESS_KEY: 'access2',
      MINIO_SECRET_KEY: 'secret2',
      MINIO_BUCKET: 'bucket2',
      REDIS_URL: undefined,
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: undefined,
      REDIS_DB: 0,
      CACHE_TTL_MS: 60000,
    });
  });

  it('throws when validation fails', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'invalid',
        PORT: -1,
        MYSQL_HOST: '',
        MYSQL_PORT: -2,
        MYSQL_USER: '',
        MYSQL_PASSWORD: '',
        MYSQL_DATABASE: '',
        MYSQL_LOGGING: 'not-boolean',
        JWT_SECRET: '',
        JWT_EXPIRES_IN: '',
        MINIO_ENDPOINT: '',
        MINIO_ACCESS_KEY: '',
        MINIO_SECRET_KEY: '',
        MINIO_BUCKET: '',
      }),
    ).toThrow(/Invalid environment variables/);
  });

  it('exposes configModuleOptions with wired validation', () => {
    const { validate } = configModuleOptions;
    if (!validate) {
      throw new Error('Expected configModuleOptions.validate to be defined');
    }

    const result = validate({
      NODE_ENV: NodeEnv.Production,
      PORT: '4500',
      MYSQL_HOST: 'config-host',
      MYSQL_PORT: '4406',
      MYSQL_USER: 'config-user',
      MYSQL_PASSWORD: 'config-password',
      MYSQL_DATABASE: 'config-db',
      MYSQL_LOGGING: 'false',
      JWT_SECRET: 'config-jwt',
      JWT_EXPIRES_IN: '3h',
      MINIO_ENDPOINT: 'http://config-minio',
      MINIO_ACCESS_KEY: 'config-access',
      MINIO_SECRET_KEY: 'config-key',
      MINIO_BUCKET: 'config-bucket',
    });

    expect(result).toEqual({
      NODE_ENV: NodeEnv.Production,
      PORT: 4500,
      MYSQL_HOST: 'config-host',
      MYSQL_PORT: 4406,
      MYSQL_USER: 'config-user',
      MYSQL_PASSWORD: 'config-password',
      MYSQL_DATABASE: 'config-db',
      MYSQL_LOGGING: false,
      JWT_SECRET: 'config-jwt',
      JWT_EXPIRES_IN: '3h',
      MINIO_ENDPOINT: 'http://config-minio',
      MINIO_ACCESS_KEY: 'config-access',
      MINIO_SECRET_KEY: 'config-key',
      MINIO_BUCKET: 'config-bucket',
      REDIS_URL: undefined,
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: undefined,
      REDIS_DB: 0,
      CACHE_TTL_MS: 60000,
    });
  });
});
