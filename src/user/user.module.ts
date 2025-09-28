import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '../entities/user.entity';
import { BucketModule } from '../services/bucket.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/**
 * Nest module bundling the user controller and service.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), BucketModule],
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard],
})
export class UserModule {}
