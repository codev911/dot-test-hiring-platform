import type { ConfigModuleOptions } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
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
}

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
  };
}

export const configModuleOptions: ConfigModuleOptions<Env> = {
  isGlobal: true,
  validate: (config: Record<string, unknown>): Env => validateEnv(config),
};
