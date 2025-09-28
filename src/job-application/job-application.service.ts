import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository, EntityManager, DataSource } from 'typeorm';
import { JobApplication } from '../entities/job-application.entity';
import { JobPosting } from '../entities/job-posting.entity';
import { User } from '../entities/user.entity';
import { UserResume } from '../entities/user-resume.entity';
import { JobApplicationEvent } from '../entities/job-application-event.entity';
import { JobApplicationNote } from '../entities/job-application-note.entity';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';
import type { CreateJobApplicationDto } from './dto/create-job-application.dto';
import type { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import type { AddApplicationNoteDto } from './dto/add-application-note.dto';
import type {
  JobApplicationData,
  JobApplicationWithRelationsData,
  PaginatedJobApplicationsData,
  JobApplicationEventData,
  JobApplicationNoteData,
} from '../utils/types/job.type';
import { ApplicationStatus } from '../utils/enums/application-status.enum';
import { withTransaction } from '../utils/database/transaction.util';
import { CacheHelperService } from '../utils/cache/cache.service';
import { buildCacheKey, buildHttpCacheKeyForUserPath } from '../utils/cache/cache.util';

/**
 * Business logic for job application operations.
 */
@Injectable()
export class JobApplicationService {
  /**
   * @param jobApplicationRepository Repository handling {@link JobApplication} persistence.
   * @param jobPostingRepository Repository handling {@link JobPosting} persistence.
   * @param userRepository Repository handling {@link User} persistence.
   * @param userResumeRepository Repository handling {@link UserResume} persistence.
   * @param jobApplicationEventRepository Repository for {@link JobApplicationEvent} entities.
   * @param jobApplicationNoteRepository Repository for {@link JobApplicationNote} entities.
   * @param companyRecruiterRepository Repository for {@link CompanyRecruiter} entities.
   */
  constructor(
    @InjectRepository(JobApplication)
    private readonly jobApplicationRepository: Repository<JobApplication>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserResume)
    private readonly userResumeRepository: Repository<UserResume>,
    @InjectRepository(JobApplicationEvent)
    private readonly jobApplicationEventRepository: Repository<JobApplicationEvent>,
    @InjectRepository(JobApplicationNote)
    private readonly jobApplicationNoteRepository: Repository<JobApplicationNote>,
    @InjectRepository(CompanyRecruiter)
    private readonly companyRecruiterRepository: Repository<CompanyRecruiter>,
    private readonly cache: CacheHelperService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Create a new job application for a candidate.
   *
   * @param candidateId The candidate's user ID.
   * @param dto Job application creation payload.
   * @returns Created job application data.
   * @throws NotFoundException When job posting or resume is not found.
   * @throws ConflictException When candidate has already applied to this job.
   * @throws BadRequestException When job posting is not published.
   */
  async createJobApplication(
    candidateId: string,
    dto: CreateJobApplicationDto,
  ): Promise<JobApplicationData> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: dto.jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (!jobPosting.isPublished) {
      throw new BadRequestException('Job posting is not published.');
    }

    // Check if candidate has already applied
    const existingApplication = await this.jobApplicationRepository.findOne({
      where: { jobId: dto.jobId, candidateId },
    });

    if (existingApplication) {
      throw new ConflictException('You have already applied to this job posting.');
    }

    // Validate resume if provided
    if (dto.resumeId) {
      const resume = await this.userResumeRepository.findOne({
        where: { id: dto.resumeId, userId: candidateId },
      });

      if (!resume) {
        throw new NotFoundException('Resume not found or does not belong to you.');
      }
    }

    const application = this.jobApplicationRepository.create({
      jobId: dto.jobId,
      candidateId,
      resumeId: dto.resumeId,
      coverLetter: dto.coverLetter,
      expectedSalary: dto.expectedSalary,
      salaryCurrency: dto.salaryCurrency,
      availableFrom: dto.availableFrom,
      status: ApplicationStatus.APPLIED,
      submittedAt: new Date(),
    });

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobApplication) : this.jobApplicationRepository;
      const eventRepo = em
        ? em.getRepository(JobApplicationEvent)
        : this.jobApplicationEventRepository;

      const savedApplication = await repo.save(application);

      // Create initial application event
      const event = eventRepo.create({
        applicationId: savedApplication.id,
        status: ApplicationStatus.APPLIED,
        occurredAt: new Date(),
      });
      await eventRepo.save(event);

      return savedApplication;
    });

    // Invalidate candidate caches (list + detail + HTTP index/base)
    await this.cache.del(
      buildCacheKey('job-application', 'candidate', 'detail', candidateId, saved.id),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'job-application', 'candidate', 'list', candidateId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'job-application', 'candidate', 'list', candidateId),
    );
    await this.cache.del(
      buildHttpCacheKeyForUserPath(candidateId, '/job-application/my-applications'),
    );

    // Invalidate recruiter job applications list index
    const posting = await this.jobPostingRepository.findOne({ where: { id: dto.jobId } });
    if (posting) {
      await this.cache.invalidateIndex(
        buildCacheKey(
          'idx',
          'job-application',
          'recruiter',
          'job',
          'list',
          posting.recruiterId,
          dto.jobId,
        ),
      );
      await this.cache.invalidateIndex(
        buildCacheKey(
          'idx',
          'http',
          'job-application',
          'recruiter',
          'job',
          'list',
          posting.recruiterId,
          dto.jobId,
        ),
      );
    }

    return this.toJobApplicationData(saved);
  }

  /**
   * Get job applications for a specific candidate.
   *
   * @param candidateId The candidate's user ID.
   * @param page Page number (1-based).
   * @param limit Number of items per page.
   * @returns Paginated job applications for the candidate.
   */
  async getCandidateApplications(
    candidateId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedJobApplicationsData> {
    const key = buildCacheKey('job-application', 'candidate', 'list', candidateId, page, limit);
    const indexKey = buildCacheKey('idx', 'job-application', 'candidate', 'list', candidateId);
    const httpIndexKey = buildCacheKey(
      'idx',
      'http',
      'job-application',
      'candidate',
      'list',
      candidateId,
    );
    const httpKey = buildHttpCacheKeyForUserPath(candidateId, '/job-application/my-applications', {
      page,
      limit,
    });
    const result = await this.cache.rememberList(
      indexKey,
      key,
      async () => {
        const skip = (page - 1) * limit;

        const [applications, totalData] = await this.jobApplicationRepository.findAndCount({
          where: { candidateId },
          relations: ['job', 'job.company', 'candidate', 'resume'],
          skip,
          take: limit,
          order: { submittedAt: 'DESC' },
        });

        const totalPage = Math.ceil(totalData / limit);
        const effectivePage = totalPage > 0 ? Math.min(page, totalPage) : 1;
        let effectiveApps = applications;

        if (effectivePage !== page) {
          const fallbackSkip = (effectivePage - 1) * limit;
          effectiveApps = await this.jobApplicationRepository.find({
            where: { candidateId },
            relations: ['job', 'job.company', 'candidate', 'resume'],
            skip: fallbackSkip,
            take: limit,
            order: { submittedAt: 'DESC' },
          });
        }

        const data = effectiveApps.map((app) => this.toJobApplicationWithRelationsData(app));

        return {
          data,
          totalData,
          page: effectivePage,
          limit,
          totalPage,
        };
      },
      300_000,
    );
    await this.cache.trackKey(httpIndexKey, httpKey);
    return result;
  }

  /**
   * Get a specific job application by ID for a candidate.
   *
   * @param candidateId The candidate's user ID.
   * @param applicationId The application ID.
   * @returns Job application with relations.
   * @throws NotFoundException When application is not found.
   * @throws ForbiddenException When candidate doesn't own the application.
   */
  async getCandidateApplication(
    candidateId: string,
    applicationId: string,
  ): Promise<JobApplicationWithRelationsData> {
    const key = buildCacheKey('job-application', 'candidate', 'detail', candidateId, applicationId);
    return this.cache.getOrSet(
      key,
      async () => {
        const application = await this.jobApplicationRepository.findOne({
          where: { id: applicationId },
          relations: ['job', 'job.company', 'candidate', 'resume'],
        });

        if (!application) {
          throw new NotFoundException('Job application not found.');
        }

        if (application.candidateId !== candidateId) {
          throw new ForbiddenException('You can only access your own applications.');
        }

        return this.toJobApplicationWithRelationsData(application);
      },
      300_000,
    );
  }

  /**
   * Withdraw a job application by a candidate.
   *
   * @param candidateId The candidate's user ID.
   * @param applicationId The application ID.
   * @returns Updated application data.
   * @throws NotFoundException When application is not found.
   * @throws ForbiddenException When candidate doesn't own the application.
   * @throws BadRequestException When application cannot be withdrawn.
   */
  async withdrawApplication(
    candidateId: string,
    applicationId: string,
  ): Promise<JobApplicationData> {
    const application = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Job application not found.');
    }

    if (application.candidateId !== candidateId) {
      throw new ForbiddenException('You can only withdraw your own applications.');
    }

    if (application.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Application has already been withdrawn.');
    }

    if (application.status === ApplicationStatus.HIRED) {
      throw new BadRequestException('Cannot withdraw a hired application.');
    }

    application.status = ApplicationStatus.WITHDRAWN;

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobApplication) : this.jobApplicationRepository;
      const eventRepo = em
        ? em.getRepository(JobApplicationEvent)
        : this.jobApplicationEventRepository;

      const savedApplication = await repo.save(application);

      // Create withdrawal event
      const event = eventRepo.create({
        applicationId: savedApplication.id,
        status: ApplicationStatus.WITHDRAWN,
        note: 'Application withdrawn by candidate',
        occurredAt: new Date(),
      });
      await eventRepo.save(event);

      return savedApplication;
    });

    // Invalidate candidate caches
    await this.cache.del(
      buildCacheKey('job-application', 'candidate', 'detail', candidateId, applicationId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'job-application', 'candidate', 'list', candidateId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'job-application', 'candidate', 'list', candidateId),
    );
    await this.cache.del(
      buildHttpCacheKeyForUserPath(candidateId, '/job-application/my-applications'),
    );
    // Invalidate candidate HTTP detail index
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'job-application', 'candidate', 'detail', candidateId),
    );

    // Invalidate recruiter caches for job list/detail if available
    const posting = await this.jobPostingRepository.findOne({ where: { id: application.jobId } });
    if (posting) {
      await this.cache.invalidateIndex(
        buildCacheKey(
          'idx',
          'job-application',
          'recruiter',
          'job',
          'list',
          posting.recruiterId,
          application.jobId,
        ),
      );
      await this.cache.invalidateIndex(
        buildCacheKey(
          'idx',
          'http',
          'job-application',
          'recruiter',
          'job',
          'list',
          posting.recruiterId,
          application.jobId,
        ),
      );
      await this.cache.invalidateIndex(
        buildCacheKey('idx', 'http', 'job-application', 'recruiter', 'detail', posting.recruiterId),
      );
    }

    return this.toJobApplicationData(saved);
  }

  /**
   * Get job applications for a specific job posting (recruiter only).
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param jobId The job posting ID.
   * @param page Page number (1-based).
   * @param limit Number of items per page.
   * @returns Paginated job applications for the job.
   * @throws NotFoundException When job posting is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async getJobApplications(
    companyRecruiterId: string,
    jobId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedJobApplicationsData> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only access applications for your own job postings.');
    }

    const key = buildCacheKey(
      'job-application',
      'recruiter',
      'job',
      'list',
      companyRecruiterId,
      jobId,
      page,
      limit,
    );
    const indexKey = buildCacheKey(
      'idx',
      'job-application',
      'recruiter',
      'job',
      'list',
      companyRecruiterId,
      jobId,
    );

    return this.cache.rememberList(
      indexKey,
      key,
      async () => {
        const skip = (page - 1) * limit;

        const [applications, totalData] = await this.jobApplicationRepository.findAndCount({
          where: { jobId },
          relations: ['job', 'job.company', 'candidate', 'resume'],
          skip,
          take: limit,
          order: { submittedAt: 'DESC' },
        });

        const totalPage = Math.ceil(totalData / limit);
        const effectivePage = totalPage > 0 ? Math.min(page, totalPage) : 1;
        let effectiveApps = applications;

        if (effectivePage !== page) {
          const fallbackSkip = (effectivePage - 1) * limit;
          effectiveApps = await this.jobApplicationRepository.find({
            where: { jobId },
            relations: ['job', 'job.company', 'candidate', 'resume'],
            skip: fallbackSkip,
            take: limit,
            order: { submittedAt: 'DESC' },
          });
        }

        const data = effectiveApps.map((app) => this.toJobApplicationWithRelationsData(app));

        return {
          data,
          totalData,
          page: effectivePage,
          limit,
          totalPage,
        };
      },
      300_000,
    );
  }

  /**
   * Get a specific job application by ID (recruiter only).
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param applicationId The application ID.
   * @returns Job application with relations.
   * @throws NotFoundException When application is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async getRecruiterApplication(
    companyRecruiterId: string,
    applicationId: string,
  ): Promise<JobApplicationWithRelationsData> {
    const key = buildCacheKey(
      'job-application',
      'recruiter',
      'detail',
      companyRecruiterId,
      applicationId,
    );
    return this.cache.getOrSet(
      key,
      async () => {
        const application = await this.jobApplicationRepository.findOne({
          where: { id: applicationId },
          relations: ['job', 'job.company', 'candidate', 'resume'],
        });

        if (!application) {
          throw new NotFoundException('Job application not found.');
        }

        if (application.job.recruiterId !== companyRecruiterId) {
          throw new ForbiddenException(
            'You can only access applications for your own job postings.',
          );
        }

        return this.toJobApplicationWithRelationsData(application);
      },
      300_000,
    );
  }

  /**
   * Update application status (recruiter only).
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param applicationId The application ID.
   * @param dto Status update payload.
   * @returns Application event data.
   * @throws NotFoundException When application is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async updateApplicationStatus(
    companyRecruiterId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<JobApplicationEventData> {
    const application = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Job application not found.');
    }

    if (application.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only update applications for your own job postings.');
    }

    application.status = dto.status;

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobApplication) : this.jobApplicationRepository;
      const eventRepo = em
        ? em.getRepository(JobApplicationEvent)
        : this.jobApplicationEventRepository;

      await repo.save(application);

      // Create status change event
      const event = eventRepo.create({
        applicationId,
        status: dto.status,
        note: dto.note,
        occurredAt: new Date(),
      });
      const savedEvent = await eventRepo.save(event);

      return savedEvent;
    });

    // Invalidate recruiter detail and list for the job
    await this.cache.del(
      buildCacheKey('job-application', 'recruiter', 'detail', companyRecruiterId, applicationId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey(
        'idx',
        'job-application',
        'recruiter',
        'job',
        'list',
        companyRecruiterId,
        application.job.id,
      ),
    );
    await this.cache.invalidateIndex(
      buildCacheKey(
        'idx',
        'http',
        'job-application',
        'recruiter',
        'job',
        'list',
        companyRecruiterId,
        application.job.id,
      ),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'job-application', 'recruiter', 'detail', companyRecruiterId),
    );

    // Invalidate candidate caches
    await this.cache.del(
      buildCacheKey(
        'job-application',
        'candidate',
        'detail',
        application.candidateId,
        applicationId,
      ),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'job-application', 'candidate', 'list', application.candidateId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'job-application', 'candidate', 'list', application.candidateId),
    );
    await this.cache.del(
      buildHttpCacheKeyForUserPath(application.candidateId, '/job-application/my-applications'),
    );
    // Invalidate candidate HTTP detail index
    await this.cache.invalidateIndex(
      buildCacheKey(
        'idx',
        'http',
        'job-application',
        'candidate',
        'detail',
        application.candidateId,
      ),
    );

    return this.toJobApplicationEventData(saved);
  }

  /**
   * Add a note to an application (recruiter only).
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param applicationId The application ID.
   * @param dto Note addition payload.
   * @returns Application note data.
   * @throws NotFoundException When application is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async addApplicationNote(
    companyRecruiterId: string,
    applicationId: string,
    dto: AddApplicationNoteDto,
  ): Promise<JobApplicationNoteData> {
    const application = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Job application not found.');
    }

    if (application.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only update applications for your own job postings.');
    }

    // Create note
    const note = this.jobApplicationNoteRepository.create({
      applicationId,
      note: dto.note,
    });
    const saved = await this.jobApplicationNoteRepository.save(note);

    // Invalidate recruiter detail and job list
    await this.cache.del(
      buildCacheKey('job-application', 'recruiter', 'detail', companyRecruiterId, applicationId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey(
        'idx',
        'job-application',
        'recruiter',
        'job',
        'list',
        companyRecruiterId,
        application.job.id,
      ),
    );
    await this.cache.invalidateIndex(
      buildCacheKey(
        'idx',
        'http',
        'job-application',
        'recruiter',
        'job',
        'list',
        companyRecruiterId,
        application.job.id,
      ),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'job-application', 'recruiter', 'detail', companyRecruiterId),
    );

    const noteWithAuthor = await this.jobApplicationNoteRepository.findOne({
      where: { id: saved.id },
      relations: ['author', 'author.recruiterIdRel'],
    });

    return this.toJobApplicationNoteData(noteWithAuthor!);
  }

  /**
   * Get notes for an application (recruiter only).
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param applicationId The application ID.
   * @returns Array of application notes.
   * @throws NotFoundException When application is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async getApplicationNotes(
    companyRecruiterId: string,
    applicationId: string,
  ): Promise<JobApplicationNoteData[]> {
    const application = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Job application not found.');
    }

    if (application.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException(
        'You can only access notes for applications for your own job postings.',
      );
    }

    const notes = await this.jobApplicationNoteRepository.find({
      where: { applicationId },
      relations: ['author', 'author.recruiterIdRel'],
      order: { createdAt: 'DESC' },
    });

    return notes.map((note) => this.toJobApplicationNoteData(note));
  }

  /**
   * Get application events/history (recruiter only).
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param applicationId The application ID.
   * @returns Array of application events.
   * @throws NotFoundException When application is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async getApplicationEvents(
    companyRecruiterId: string,
    applicationId: string,
  ): Promise<JobApplicationEventData[]> {
    const application = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Job application not found.');
    }

    if (application.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException(
        'You can only access events for applications for your own job postings.',
      );
    }

    const events = await this.jobApplicationEventRepository.find({
      where: { applicationId },
      order: { occurredAt: 'DESC' },
    });

    return events.map((event) => this.toJobApplicationEventData(event));
  }

  /**
   * Convert job application entity to data projection.
   *
   * @param entity Job application entity.
   * @returns JobApplicationData projection.
   */
  private toJobApplicationData(entity: JobApplication): JobApplicationData {
    return {
      id: entity.id,
      jobId: entity.jobId,
      candidateId: entity.candidateId,
      resumeId: entity.resumeId,
      coverLetter: entity.coverLetter,
      status: entity.status,
      expectedSalary: entity.expectedSalary,
      salaryCurrency: entity.salaryCurrency,
      availableFrom: entity.availableFrom,
      submittedAt: entity.submittedAt,
      createdAt: entity.createdAt!,
      updatedAt: entity.updatedAt!,
    };
  }

  /**
   * Convert job application entity to data projection with relations.
   *
   * @param entity Job application entity with relations.
   * @returns JobApplicationWithRelationsData projection.
   */
  private toJobApplicationWithRelationsData(
    entity: JobApplication,
  ): JobApplicationWithRelationsData {
    return {
      ...this.toJobApplicationData(entity),
      job: {
        id: entity.job.id,
        title: entity.job.title,
        companyName: entity.job.company.name,
      },
      candidate: {
        id: entity.candidate.id,
        firstName: entity.candidate.firstName,
        lastName: entity.candidate.lastName,
        email: entity.candidate.email,
      },
      resume: entity.resume
        ? {
            id: entity.resume.id,
            resumeUrl: entity.resume.resumePath,
          }
        : undefined,
    };
  }

  /**
   * Convert job application event entity to data projection.
   *
   * @param entity Job application event entity.
   * @returns JobApplicationEventData projection.
   */
  private toJobApplicationEventData(entity: JobApplicationEvent): JobApplicationEventData {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      status: entity.status,
      note: entity.note,
      occurredAt: entity.occurredAt,
      createdAt: entity.createdAt!,
      updatedAt: entity.updatedAt!,
    };
  }

  /**
   * Convert job application note entity to data projection.
   *
   * @param entity Job application note entity with author.
   * @returns JobApplicationNoteData projection.
   */
  private toJobApplicationNoteData(entity: JobApplicationNote): JobApplicationNoteData {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      authorRecruiterId: entity.authorRecruiterId,
      note: entity.note,
      createdAt: entity.createdAt!,
      updatedAt: entity.updatedAt!,
      author: {
        id: entity.author.recruiterIdRel.id,
        firstName: entity.author.recruiterIdRel.firstName,
        lastName: entity.author.recruiterIdRel.lastName,
      },
    };
  }
}
