import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPostingController } from './job-posting.controller';
import { JobPostingService } from './job-posting.service';
import { JobPosting } from '../entities/job-posting.entity';
import { Company } from '../entities/company.entity';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';
import { JobBenefit } from '../entities/job-benefit.entity';
import { JobRequirement } from '../entities/job-requirement.entity';
import { JobSkill } from '../entities/job-skill.entity';

/**
 * Module for job posting management and public job discovery.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobPosting,
      Company,
      CompanyRecruiter,
      JobBenefit,
      JobRequirement,
      JobSkill,
    ]),
  ],
  controllers: [JobPostingController],
  providers: [JobPostingService],
  exports: [JobPostingService],
})
export class JobPostingModule {}
