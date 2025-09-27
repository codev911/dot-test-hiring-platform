import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configModuleOptions } from './utils/config/env.schema';
import { RATE_LIMIT } from './utils/constants/rate-limit.constant';

/**
 * Root NestJS module that wires together controllers and providers for the application runtime.
 */
@Module({
  imports: [
    // bootstrap config from .env and enforce schema defaults
    ConfigModule.forRoot(configModuleOptions),
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
