import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/**
 * Nest module wiring authentication controllers, services, and dependencies.
 *
 * Note: JwtService is provided globally via AppModule's JwtModule.registerAsync().
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, CompanyRecruiter])],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
