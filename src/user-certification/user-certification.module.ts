import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCertificationService } from './user-certification.service';
import { UserCertificationController } from './user-certification.controller';
import { User } from '../entities/user.entity';
import { UserCertification } from '../entities/user-certification.entity';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';
import { BucketModule } from '../services/bucket.module';

/**
 * NestJS module bundling the user certification controller and service.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, UserCertification]), BucketModule],
  controllers: [UserCertificationController],
  providers: [UserCertificationService, CandidateAuthGuard],
})
export class UserCertificationModule {}
