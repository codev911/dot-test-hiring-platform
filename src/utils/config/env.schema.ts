import type { ConfigModuleOptions } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
  type ValidationError,
} from 'class-validator';
import { NodeEnv } from '../enums/node-env.enum';
import type { Env } from '../types/env.type';

/**
 * Declarative schema describing required environment variables for the app.
 */
class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  MYSQL_HOST!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  MYSQL_PORT!: number;

  @IsString()
  @IsNotEmpty()
  MYSQL_USER!: string;

  @IsString()
  @IsNotEmpty()
  MYSQL_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  MYSQL_DATABASE!: string;

  @IsBoolean()
  MYSQL_LOGGING: boolean = false;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ENDPOINT!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ACCESS_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET!: string;

  // Optional URL takes precedence over individual REDIS_* parts
  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  REDIS_HOST: string = '127.0.0.1';

  @IsInt()
  @Min(0)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsInt()
  @Min(0)
  REDIS_DB: number = 0;

  @IsInt()
  @Min(0)
  CACHE_TTL_MS: number = 60_000; // 60 seconds by default
}

/**
 * Normalize truthy and falsy string representations to booleans.
 *
 * @param value Raw value from environment configuration.
 * @param defaultValue Fallback when the value cannot be interpreted.
 * @returns Boolean representation of the input.
 */
function normaliseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) {
      return true;
    }

    if (['false', '0', 'no', 'n', 'off'].includes(normalised)) {
      return false;
    }
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return defaultValue;
}

/**
 * Validate raw environment configuration using class-validator metadata.
 *
 * @param config - Raw environment shape supplied by ConfigModule.
 * @returns Sanitised environment variables with defaults applied.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  validated.MYSQL_LOGGING = normaliseBoolean(config.MYSQL_LOGGING, validated.MYSQL_LOGGING);

  const errors: ValidationError[] = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => {
        const constraints: Record<string, string> = error.constraints ?? {};
        const messages = Object.values(constraints);
        return messages.length > 0 ? `${error.property}: ${messages.join(', ')}` : error.property;
      })
      .join('; ');

    throw new Error(`Invalid environment variables - ${details}`);
  }

  return {
    NODE_ENV: validated.NODE_ENV,
    PORT: validated.PORT,
    MYSQL_HOST: validated.MYSQL_HOST,
    MYSQL_PORT: validated.MYSQL_PORT,
    MYSQL_USER: validated.MYSQL_USER,
    MYSQL_PASSWORD: validated.MYSQL_PASSWORD,
    MYSQL_DATABASE: validated.MYSQL_DATABASE,
    MYSQL_LOGGING: validated.MYSQL_LOGGING,
    JWT_SECRET: validated.JWT_SECRET,
    JWT_EXPIRES_IN: validated.JWT_EXPIRES_IN,
    MINIO_ENDPOINT: validated.MINIO_ENDPOINT,
    MINIO_ACCESS_KEY: validated.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: validated.MINIO_SECRET_KEY,
    MINIO_BUCKET: validated.MINIO_BUCKET,
    REDIS_URL: validated.REDIS_URL,
    REDIS_HOST: validated.REDIS_HOST,
    REDIS_PORT: validated.REDIS_PORT,
    REDIS_PASSWORD: validated.REDIS_PASSWORD,
    REDIS_DB: validated.REDIS_DB,
    CACHE_TTL_MS: validated.CACHE_TTL_MS,
  };
}

export const configModuleOptions: ConfigModuleOptions<Env> = {
  isGlobal: true,
  validate: (config: Record<string, unknown>): Env => validateEnv(config),
};
