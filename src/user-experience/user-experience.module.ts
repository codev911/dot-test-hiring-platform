import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserExperienceService } from './user-experience.service';
import { UserExperienceController } from './user-experience.controller';
import { User } from '../entities/user.entity';
import { UserExperience } from '../entities/user-experience.entity';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';

/**
 * NestJS module bundling the user experience controller and service.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, UserExperience])],
  controllers: [UserExperienceController],
  providers: [UserExperienceService, CandidateAuthGuard],
})
export class UserExperienceModule {}
