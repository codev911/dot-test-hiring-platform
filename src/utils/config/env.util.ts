import type { ConfigService } from '@nestjs/config';
import type { NodeEnv } from '../enums/node-env.enum';
import type { Env } from '../types/env.type';

/**
 * Gather typed environment variables from Nest's ConfigService.
 *
 * @param configService - Config service instance typed with {@link Env}.
 * @returns Validated environment variables with defaults applied.
 */
export function collectEnv(configService: ConfigService<Env>): Env {
  return {
    NODE_ENV: configService.getOrThrow<NodeEnv>('NODE_ENV'),
    PORT: configService.getOrThrow<number>('PORT'),
    MYSQL_HOST: configService.getOrThrow<string>('MYSQL_HOST'),
    MYSQL_PORT: configService.getOrThrow<number>('MYSQL_PORT'),
    MYSQL_USER: configService.getOrThrow<string>('MYSQL_USER'),
    MYSQL_PASSWORD: configService.getOrThrow<string>('MYSQL_PASSWORD'),
    MYSQL_DATABASE: configService.getOrThrow<string>('MYSQL_DATABASE'),
    MYSQL_LOGGING: configService.get<boolean>('MYSQL_LOGGING') ?? false,
    JWT_SECRET: configService.getOrThrow<string>('JWT_SECRET'),
    JWT_EXPIRES_IN: configService.getOrThrow<string>('JWT_EXPIRES_IN'),
    MINIO_ENDPOINT: configService.getOrThrow<string>('MINIO_ENDPOINT'),
    MINIO_ACCESS_KEY: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
    MINIO_SECRET_KEY: configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    MINIO_BUCKET: configService.getOrThrow<string>('MINIO_BUCKET'),
    REDIS_URL: configService.get<string>('REDIS_URL'),
    REDIS_HOST: configService.get<string>('REDIS_HOST'),
    REDIS_PORT: configService.get<number>('REDIS_PORT'),
    REDIS_PASSWORD: configService.get<string>('REDIS_PASSWORD'),
    REDIS_DB: configService.get<number>('REDIS_DB'),
    CACHE_TTL_MS: configService.get<number>('CACHE_TTL_MS'),
  };
}
