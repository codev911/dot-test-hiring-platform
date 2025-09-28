import path from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { collectEnv } from './utils/config/env.util';
import { configModuleOptions } from './utils/config/env.schema';
import { RATE_LIMIT } from './utils/constants/rate-limit.constant';
import type { Env } from './utils/types/env.type';
import { ErrorResponseInterceptor } from './common/interceptors/error-response.interceptor';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BucketModule } from './services/bucket.module';
import { UserResumeModule } from './user-resume/user-resume.module';
import { UserSkillModule } from './user-skill/user-skill.module';
import { UserEducationModule } from './user-education/user-education.module';
import { UserExperienceModule } from './user-experience/user-experience.module';

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
    // configure JWT module for application-wide usage
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => {
        const env = collectEnv(configService);
        return {
          secret: env.JWT_SECRET,
          signOptions: {
            expiresIn: env.JWT_EXPIRES_IN,
          },
        };
      },
    }),
    // add rate limit max 100 per minutes
    ThrottlerModule.forRoot({
      throttlers: [RATE_LIMIT],
    }),
    AuthModule,
    UserModule,
    BucketModule,
    UserResumeModule,
    UserSkillModule,
    UserEducationModule,
    UserExperienceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SuccessResponseInterceptor,
    ErrorResponseInterceptor,
    // using ThrottlerGuard to enable rate limit at AppController
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useExisting: SuccessResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useExisting: ErrorResponseInterceptor,
    },
  ],
})
export class AppModule {}
