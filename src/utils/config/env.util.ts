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
  };
}
