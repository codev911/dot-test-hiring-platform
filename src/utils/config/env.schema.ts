import type { ConfigModuleOptions } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, Max, Min, validateSync, type ValidationError } from 'class-validator';
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
  };
}

export const configModuleOptions: ConfigModuleOptions<Env> = {
  isGlobal: true,
  validate: (config: Record<string, unknown>): Env => validateEnv(config),
};
