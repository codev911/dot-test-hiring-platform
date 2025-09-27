import path from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { collectEnv } from './utils/config/env.util';
import { configModuleOptions } from './utils/config/env.schema';
import { RATE_LIMIT } from './utils/constants/rate-limit.constant';
import type { Env } from './utils/types/env.type';

/**
 * Root NestJS module that wires together controllers and providers for the application runtime.
 */
@Module({
  imports: [
    // bootstrap config from .env and enforce schema defaults
    ConfigModule.forRoot(configModuleOptions),
    // configure database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>): TypeOrmModuleOptions => {
        const env = collectEnv(configService);

        return {
          type: 'mysql',
          host: env.MYSQL_HOST,
          port: env.MYSQL_PORT,
          username: env.MYSQL_USER,
          password: env.MYSQL_PASSWORD,
          database: env.MYSQL_DATABASE,
          logging: env.MYSQL_LOGGING,
          synchronize: false,
          autoLoadEntities: false,
          entities: [path.join(__dirname, 'entities', '**', '*.entity.{ts,js}')],
        };
      },
    }),
    // add rate limit max 100 per minutes
    ThrottlerModule.forRoot({
      throttlers: [RATE_LIMIT],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // using ThrottlerGuard to enable rate limit at AppController
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
