import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserResumeService } from './user-resume.service';
import { UserResumeController } from './user-resume.controller';
import { User } from '../entities/user.entity';
import { UserResume } from '../entities/user-resume.entity';
import { BucketModule } from '../services/bucket.module';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';

/**
 * NestJS module bundling the user resume controller and service.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, UserResume]), BucketModule],
  controllers: [UserResumeController],
  providers: [UserResumeService, CandidateAuthGuard],
})
export class UserResumeModule {}
