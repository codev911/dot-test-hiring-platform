import type { NodeEnv } from '../enums/node-env.enum';

/**
 * Typed contract describing environment variables required by the application.
 */
export type Env = {
  NODE_ENV: NodeEnv;
  PORT: number;
  MYSQL_HOST: string;
  MYSQL_PORT: number;
  MYSQL_USER: string;
  MYSQL_PASSWORD: string;
  MYSQL_DATABASE: string;
  MYSQL_LOGGING: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  MINIO_ENDPOINT: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
  // Redis / cache configuration
  REDIS_URL?: string; // e.g. redis://:password@localhost:6379/0
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_DB?: number;
  CACHE_TTL_MS?: number; // default time-to-live in milliseconds
};
