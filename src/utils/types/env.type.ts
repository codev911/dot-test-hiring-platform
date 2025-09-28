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
};
