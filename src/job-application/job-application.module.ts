import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplicationController } from './job-application.controller';
import { JobApplicationService } from './job-application.service';
import { JobApplication } from '../entities/job-application.entity';
import { JobPosting } from '../entities/job-posting.entity';
import { User } from '../entities/user.entity';
import { UserResume } from '../entities/user-resume.entity';
import { JobApplicationEvent } from '../entities/job-application-event.entity';
import { JobApplicationNote } from '../entities/job-application-note.entity';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';

/**
 * Module for job application management for candidates and recruiters.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobApplication,
      JobPosting,
      User,
      UserResume,
      JobApplicationEvent,
      JobApplicationNote,
      CompanyRecruiter,
    ]),
  ],
  controllers: [JobApplicationController],
  providers: [JobApplicationService],
  exports: [JobApplicationService],
})
export class JobApplicationModule {}
