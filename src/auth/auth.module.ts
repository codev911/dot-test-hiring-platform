import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';
import { collectEnv } from '../utils/config/env.util';
import type { Env } from '../utils/types/env.type';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/**
 * Nest module wiring authentication controllers, services, and dependencies.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, CompanyRecruiter]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      /**
       * Configure JWT signing options using validated environment variables.
       */
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
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
