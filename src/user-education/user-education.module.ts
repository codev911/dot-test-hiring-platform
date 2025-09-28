import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEducationService } from './user-education.service';
import { UserEducationController } from './user-education.controller';
import { User } from '../entities/user.entity';
import { UserEducation } from '../entities/user-education.entity';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';

/**
 * NestJS module bundling the user education controller and service.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, UserEducation])],
  controllers: [UserEducationController],
  providers: [UserEducationService, CandidateAuthGuard],
})
export class UserEducationModule {}
