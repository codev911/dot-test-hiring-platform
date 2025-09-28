import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';
import { Company } from '../entities/company.entity';
import { JobBenefit } from '../entities/job-benefit.entity';
import { JobPosting } from '../entities/job-posting.entity';
import { JobRequirement } from '../entities/job-requirement.entity';
import { JobSkill } from '../entities/job-skill.entity';
import { CacheHelperService } from '../utils/cache/cache.service';
import { buildCacheKey, buildHttpCacheKeyForUserPath } from '../utils/cache/cache.util';
import { withTransaction } from '../utils/database/transaction.util';
import type {
  JobBenefitData,
  JobPostingData,
  JobPostingWithCompanyData,
  JobRequirementData,
  JobSearchFilters,
  JobSkillData,
  PaginatedJobPostingsData,
} from '../utils/types/job.type';
import type { CreateJobBenefitDto } from './dto/create-job-benefit.dto';
import type { CreateJobPostingDto } from './dto/create-job-posting.dto';
import type { CreateJobRequirementDto } from './dto/create-job-requirement.dto';
import type { CreateJobSkillDto } from './dto/create-job-skill.dto';
import type { UpdateJobBenefitDto } from './dto/update-job-benefit.dto';
import type { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import type { UpdateJobRequirementDto } from './dto/update-job-requirement.dto';
import type { UpdateJobSkillDto } from './dto/update-job-skill.dto';

/**
 * Business logic for job posting operations.
 */
@Injectable()
export class JobPostingService {
  /**
   * @param jobPostingRepository Repository handling {@link JobPosting} persistence.
   * @param companyRepository Repository handling {@link Company} persistence.
   * @param companyRecruiterRepository Repository for {@link CompanyRecruiter} entities.
   * @param jobBenefitRepository Repository for {@link JobBenefit} entities.
   * @param jobRequirementRepository Repository for {@link JobRequirement} entities.
   * @param jobSkillRepository Repository for {@link JobSkill} entities.
   */
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyRecruiter)
    private readonly companyRecruiterRepository: Repository<CompanyRecruiter>,
    @InjectRepository(JobBenefit)
    private readonly jobBenefitRepository: Repository<JobBenefit>,
    @InjectRepository(JobRequirement)
    private readonly jobRequirementRepository: Repository<JobRequirement>,
    @InjectRepository(JobSkill)
    private readonly jobSkillRepository: Repository<JobSkill>,
    private readonly cache: CacheHelperService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Create a new job posting for a specific recruiter.
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param dto Job posting creation payload.
   * @returns Created job posting data.
   * @throws NotFoundException When recruiter mapping is not found.
   */
  async createJobPosting(
    companyRecruiterId: string,
    dto: CreateJobPostingDto,
  ): Promise<JobPostingData> {
    const recruiterMapping = await this.companyRecruiterRepository.findOne({
      where: { id: companyRecruiterId },
      relations: ['company'],
    });

    if (!recruiterMapping) {
      throw new NotFoundException('Recruiter mapping not found.');
    }

    const slug = await this.generateUniqueSlug(dto.title);

    const jobPosting = this.jobPostingRepository.create({
      companyId: recruiterMapping.companyId,
      recruiterId: companyRecruiterId,
      title: dto.title,
      slug,
      description: dto.description,
      employmentType: dto.employmentType,
      workLocationType: dto.workLocationType,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      salaryCurrency: dto.salaryCurrency,
      isPublished: dto.isPublished ?? false,
    });

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobPosting) : this.jobPostingRepository;
      return repo.save(jobPosting);
    });

    // Invalidate caches affected by new posting
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', saved.id));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', saved.slug));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    // Also clear base HTTP key (no query params) for public listing
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    // Invalidate recruiter listing
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'jobs', 'recruiter', 'list', companyRecruiterId),
    );

    return this.toJobPostingData(saved);
  }

  /**
   * Get all job postings for a specific recruiter.
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param page Page number (1-based).
   * @param limit Number of items per page.
   * @returns Paginated job postings for the recruiter.
   */
  async getRecruiterJobPostings(
    companyRecruiterId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedJobPostingsData> {
    const key = buildCacheKey('jobs', 'recruiter', 'list', companyRecruiterId, page, limit);
    const indexKey = buildCacheKey('idx', 'jobs', 'recruiter', 'list', companyRecruiterId);
    return await this.cache.rememberList(
      indexKey,
      key,
      async () => {
        const skip = (page - 1) * limit;

        const [jobPostings, totalData] = await this.jobPostingRepository.findAndCount({
          where: { recruiterId: companyRecruiterId },
          relations: ['company'],
          skip,
          take: limit,
          order: { createdAt: 'DESC' },
        });

        const data = jobPostings.map((job) => this.toJobPostingWithCompanyData(job));
        const totalPage = Math.ceil(totalData / limit);

        return {
          data,
          totalData,
          page,
          limit,
          totalPage,
        };
      },
      300_000,
    );
  }

  /**
   * Get a specific job posting by ID for a recruiter.
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param jobId The job posting ID.
   * @returns Job posting with company details.
   * @throws NotFoundException When job posting is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async getRecruiterJobPosting(
    companyRecruiterId: string,
    jobId: string,
  ): Promise<JobPostingWithCompanyData> {
    const key = buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId);
    return this.cache.getOrSet(
      key,
      async () => {
        const jobPosting = await this.jobPostingRepository.findOne({
          where: { id: jobId },
          relations: ['company'],
        });

        if (!jobPosting) {
          throw new NotFoundException('Job posting not found.');
        }

        if (jobPosting.recruiterId !== companyRecruiterId) {
          throw new ForbiddenException('You can only access your own job postings.');
        }

        const [benefits, requirements, skills] = await Promise.all([
          this.jobBenefitRepository.find({ where: { jobId } }),
          this.jobRequirementRepository.find({ where: { jobId } }),
          this.jobSkillRepository.find({ where: { jobId } }),
        ]);

        return {
          ...this.toJobPostingData(jobPosting),
          company: {
            id: jobPosting.company.id,
            name: jobPosting.company.name,
            description: jobPosting.company.description ?? undefined,
          },
          benefits: benefits.map((benefit) => ({
            id: benefit.id,
            jobId: benefit.jobId,
            label: benefit.label,
            description: benefit.description ?? undefined,
            createdAt: benefit.createdAt!,
            updatedAt: benefit.updatedAt!,
          })),
          requirements: requirements.map((req) => ({
            id: req.id,
            jobId: req.jobId,
            label: req.label,
            detail: req.detail ?? undefined,
            createdAt: req.createdAt!,
            updatedAt: req.updatedAt!,
          })),
          skills: skills.map((skill) => ({
            id: skill.id,
            jobId: skill.jobId,
            skillName: skill.skillName,
            priority: skill.priority,
            proficiency: skill.proficiency,
            createdAt: skill.createdAt!,
            updatedAt: skill.updatedAt!,
          })),
        };
      },
      300_000,
    );
  }

  /**
   * Update a job posting owned by a recruiter.
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param jobId The job posting ID.
   * @param dto Update payload.
   * @returns Updated job posting data.
   * @throws NotFoundException When job posting is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async updateJobPosting(
    companyRecruiterId: string,
    jobId: string,
    dto: UpdateJobPostingDto,
  ): Promise<JobPostingData> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only update your own job postings.');
    }

    if (dto.title !== undefined) {
      jobPosting.title = dto.title;
      jobPosting.slug = await this.generateUniqueSlug(dto.title, jobId);
    }
    if (dto.description !== undefined) jobPosting.description = dto.description;
    if (dto.employmentType !== undefined) jobPosting.employmentType = dto.employmentType;
    if (dto.workLocationType !== undefined) jobPosting.workLocationType = dto.workLocationType;
    if (dto.salaryMin !== undefined) jobPosting.salaryMin = dto.salaryMin;
    if (dto.salaryMax !== undefined) jobPosting.salaryMax = dto.salaryMax;
    if (dto.salaryCurrency !== undefined) jobPosting.salaryCurrency = dto.salaryCurrency;
    if (dto.isPublished !== undefined) jobPosting.isPublished = dto.isPublished;

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobPosting) : this.jobPostingRepository;
      return repo.save(jobPosting);
    });

    // Invalidate affected caches (detail by id and slug) and public listings
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', saved.id));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', saved.slug));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    // Invalidate recruiter caches for this recruiter (service + HTTP indices)
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'jobs', 'recruiter', 'list', companyRecruiterId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'list', companyRecruiterId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'detail', companyRecruiterId),
    );

    return this.toJobPostingData(saved);
  }

  /**
   * Delete a job posting owned by a recruiter.
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param jobId The job posting ID.
   * @throws NotFoundException When job posting is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async deleteJobPosting(companyRecruiterId: string, jobId: string): Promise<void> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only delete your own job postings.');
    }

    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobPosting) : this.jobPostingRepository;
      await repo.remove(jobPosting);
    });

    // Invalidate caches
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobPosting.slug));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'jobs', 'recruiter', 'list', companyRecruiterId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'list', companyRecruiterId),
    );
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'detail', companyRecruiterId),
    );
  }

  /**
   * Get public job postings with company details (for candidates).
   *
   * @param filters Search filters.
   * @param page Page number (1-based).
   * @param limit Number of items per page.
   * @returns Paginated published job postings.
   */
  async getPublishedJobPostings(
    filters: JobSearchFilters = {},
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedJobPostingsData> {
    const key = buildCacheKey(
      'jobs',
      'public',
      'list',
      filters.query,
      filters.location,
      filters.employmentType,
      filters.workLocationType,
      filters.salaryMin,
      filters.salaryMax,
      filters.salaryCurrency,
      filters.companyId,
      filters.skills?.join(','),
      page,
      limit,
    );

    const indexKey = buildCacheKey('idx', 'jobs', 'public', 'list');
    const httpIndexKey = buildCacheKey('idx', 'http', 'jobs', 'public', 'list');
    const httpKey = buildHttpCacheKeyForUserPath(undefined, '/job-posting/public', {
      query: filters.query,
      location: filters.location,
      employmentType: filters.employmentType,
      workLocationType: filters.workLocationType,
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      salaryCurrency: filters.salaryCurrency,
      companyId: filters.companyId,
      skills: filters.skills?.join(','),
      page,
      limit,
    });

    const result = await this.cache.rememberList(
      indexKey,
      key,
      async () => {
        const skip = (page - 1) * limit;
        const queryBuilder = this.jobPostingRepository
          .createQueryBuilder('job')
          .leftJoinAndSelect('job.company', 'company')
          .where('job.isPublished = :isPublished', { isPublished: true });

        if (filters.query) {
          queryBuilder.andWhere(
            '(LOWER(job.title) LIKE LOWER(:query) OR LOWER(job.description) LIKE LOWER(:query))',
            { query: `%${filters.query}%` },
          );
        }

        if (filters.employmentType) {
          queryBuilder.andWhere('job.employmentType = :employmentType', {
            employmentType: filters.employmentType,
          });
        }

        if (filters.workLocationType) {
          queryBuilder.andWhere('job.workLocationType = :workLocationType', {
            workLocationType: filters.workLocationType,
          });
        }

        if (filters.companyId) {
          queryBuilder.andWhere('job.companyId = :companyId', {
            companyId: filters.companyId,
          });
        }

        if (filters.salaryMin) {
          queryBuilder.andWhere('job.salaryMin >= :salaryMin', {
            salaryMin: filters.salaryMin,
          });
        }

        if (filters.salaryMax) {
          queryBuilder.andWhere('job.salaryMax <= :salaryMax', {
            salaryMax: filters.salaryMax,
          });
        }

        if (filters.salaryCurrency) {
          queryBuilder.andWhere('job.salaryCurrency = :salaryCurrency', {
            salaryCurrency: filters.salaryCurrency,
          });
        }

        queryBuilder.orderBy('job.createdAt', 'DESC').skip(skip).take(limit);

        const [jobPostings, totalData] = await queryBuilder.getManyAndCount();

        const data = await Promise.all(
          jobPostings.map(async (job) => {
            const [benefits, requirements, skills] = await Promise.all([
              this.jobBenefitRepository.find({ where: { jobId: job.id } }),
              this.jobRequirementRepository.find({ where: { jobId: job.id } }),
              this.jobSkillRepository.find({ where: { jobId: job.id } }),
            ]);

            return {
              ...this.toJobPostingData(job),
              company: {
                id: job.company.id,
                name: job.company.name,
                description: job.company.description ?? undefined,
              },
              benefits: benefits.map((benefit) => ({
                id: benefit.id,
                jobId: benefit.jobId,
                label: benefit.label,
                description: benefit.description ?? undefined,
                createdAt: benefit.createdAt!,
                updatedAt: benefit.updatedAt!,
              })),
              requirements: requirements.map((req) => ({
                id: req.id,
                jobId: req.jobId,
                label: req.label,
                detail: req.detail ?? undefined,
                createdAt: req.createdAt!,
                updatedAt: req.updatedAt!,
              })),
              skills: skills.map((skill) => ({
                id: skill.id,
                jobId: skill.jobId,
                skillName: skill.skillName,
                priority: skill.priority,
                proficiency: skill.proficiency,
                createdAt: skill.createdAt!,
                updatedAt: skill.updatedAt!,
              })),
            };
          }),
        );

        const totalPage = Math.ceil(totalData / limit);

        return {
          data,
          totalData,
          page,
          limit,
          totalPage,
        };
      },
      60_000,
    ); // 60s TTL for listing
    await this.cache.trackKey(httpIndexKey, httpKey);
    return result;
  }

  /**
   * Get a specific published job posting by ID or slug (for candidates).
   *
   * @param identifier Job posting ID or slug.
   * @returns Job posting with full details.
   * @throws NotFoundException When job posting is not found or not published.
   */
  async getPublishedJobPosting(identifier: string): Promise<JobPostingWithCompanyData> {
    const key = buildCacheKey('jobs', 'public', 'detail', identifier);
    return this.cache.getOrSet<JobPostingWithCompanyData>(
      key,
      async () => {
        const jobPosting = await this.jobPostingRepository.findOne({
          where: [
            { id: identifier, isPublished: true },
            { slug: identifier, isPublished: true },
          ],
          relations: ['company'],
        });

        if (!jobPosting) {
          throw new NotFoundException('Job posting not found or not published.');
        }

        const [benefits, requirements, skills] = await Promise.all([
          this.jobBenefitRepository.find({ where: { jobId: jobPosting.id } }),
          this.jobRequirementRepository.find({ where: { jobId: jobPosting.id } }),
          this.jobSkillRepository.find({ where: { jobId: jobPosting.id } }),
        ]);

        return {
          ...this.toJobPostingData(jobPosting),
          company: {
            id: jobPosting.company.id,
            name: jobPosting.company.name,
            description: jobPosting.company.description ?? undefined,
          },
          benefits: benefits.map((benefit) => ({
            id: benefit.id,
            jobId: benefit.jobId,
            label: benefit.label,
            description: benefit.description ?? undefined,
            createdAt: benefit.createdAt!,
            updatedAt: benefit.updatedAt!,
          })),
          requirements: requirements.map((req) => ({
            id: req.id,
            jobId: req.jobId,
            label: req.label,
            detail: req.detail ?? undefined,
            createdAt: req.createdAt!,
            updatedAt: req.updatedAt!,
          })),
          skills: skills.map((skill) => ({
            id: skill.id,
            jobId: skill.jobId,
            skillName: skill.skillName,
            priority: skill.priority,
            proficiency: skill.proficiency,
            createdAt: skill.createdAt!,
            updatedAt: skill.updatedAt!,
          })),
        };
      },
      120_000,
    ); // 120s TTL for detail
  }

  /**
   * Generate a unique slug for a job posting.
   *
   * @param title The job title.
   * @param excludeId Optional job ID to exclude from uniqueness check.
   * @returns Unique slug.
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingJob = await this.jobPostingRepository.findOne({
        where: { slug },
      });

      if (!existingJob || (excludeId && existingJob.id === excludeId)) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Convert job posting entity to data projection.
   *
   * @param entity Job posting entity.
   * @returns JobPostingData projection.
   */
  private toJobPostingData(entity: JobPosting): JobPostingData {
    return {
      id: entity.id,
      companyId: entity.companyId,
      recruiterId: entity.recruiterId,
      title: entity.title,
      slug: entity.slug,
      description: entity.description,
      employmentType: entity.employmentType,
      workLocationType: entity.workLocationType,
      salaryMin: entity.salaryMin,
      salaryMax: entity.salaryMax,
      salaryCurrency: entity.salaryCurrency,
      isPublished: entity.isPublished,
      createdAt: entity.createdAt!,
      updatedAt: entity.updatedAt!,
    };
  }

  /**
   * Convert job posting entity to data projection with company details.
   *
   * @param entity Job posting entity with company relation.
   * @returns JobPostingData projection.
   */
  private toJobPostingWithCompanyData(entity: JobPosting): JobPostingWithCompanyData {
    return {
      ...this.toJobPostingData(entity),
      company: {
        id: entity.company.id,
        name: entity.company.name,
        description: entity.company.description ?? undefined,
      },
      benefits: [],
      requirements: [],
      skills: [],
    };
  }

  // ===== JOB BENEFIT MANAGEMENT =====

  /**
   * Create a new job benefit for a specific job posting.
   *
   * @param companyRecruiterId The recruiter's company mapping ID.
   * @param jobId Job posting ID.
   * @param dto Benefit creation payload.
   * @returns Created job benefit data.
   * @throws NotFoundException When job posting is not found.
   * @throws ForbiddenException When recruiter doesn't own the job.
   */
  async createJobBenefit(
    companyRecruiterId: string,
    jobId: string,
    dto: CreateJobBenefitDto,
  ): Promise<JobBenefitData> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only add benefits to your own job postings.');
    }

    const benefit = this.jobBenefitRepository.create({
      jobId,
      label: dto.label,
      description: dto.description,
    });

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobBenefit) : this.jobBenefitRepository;
      return repo.save(benefit);
    });

    // Invalidate caches affected (public listings and detail; recruiter detail)
    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'detail', companyRecruiterId),
    );

    return {
      id: saved.id,
      jobId: saved.jobId,
      label: saved.label,
      description: saved.description,
      createdAt: saved.createdAt!,
      updatedAt: saved.updatedAt!,
    };
  }

  /**
   * Get all job benefits for a specific job posting.
   */
  async getJobBenefits(companyRecruiterId: string, jobId: string): Promise<JobBenefitData[]> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only access benefits for your own job postings.');
    }

    const benefits = await this.jobBenefitRepository.find({
      where: { jobId },
      order: { createdAt: 'DESC' },
    });

    // Invalidate recruiter detail cache (list read not cached), public detail not impacted by read
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));

    return benefits.map((benefit) => ({
      id: benefit.id,
      jobId: benefit.jobId,
      label: benefit.label,
      description: benefit.description,
      createdAt: benefit.createdAt!,
      updatedAt: benefit.updatedAt!,
    }));
  }

  /**
   * Update a job benefit.
   */
  async updateJobBenefit(
    companyRecruiterId: string,
    jobId: string,
    benefitId: string,
    dto: UpdateJobBenefitDto,
  ): Promise<JobBenefitData> {
    const benefit = await this.jobBenefitRepository.findOne({
      where: { id: benefitId, jobId },
      relations: ['job'],
    });

    if (!benefit) {
      throw new NotFoundException('Job benefit not found.');
    }

    if (benefit.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only update benefits for your own job postings.');
    }

    if (dto.label !== undefined) benefit.label = dto.label;
    if (dto.description !== undefined) benefit.description = dto.description;

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobBenefit) : this.jobBenefitRepository;
      return repo.save(benefit);
    });

    // Invalidate dependent caches
    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'detail', companyRecruiterId),
    );

    return {
      id: saved.id,
      jobId: saved.jobId,
      label: saved.label,
      description: saved.description,
      createdAt: saved.createdAt!,
      updatedAt: saved.updatedAt!,
    };
  }

  /**
   * Delete a job benefit.
   */
  async deleteJobBenefit(
    companyRecruiterId: string,
    jobId: string,
    benefitId: string,
  ): Promise<void> {
    const benefit = await this.jobBenefitRepository.findOne({
      where: { id: benefitId, jobId },
      relations: ['job'],
    });

    if (!benefit) {
      throw new NotFoundException('Job benefit not found.');
    }

    if (benefit.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only delete benefits for your own job postings.');
    }

    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobBenefit) : this.jobBenefitRepository;
      await repo.remove(benefit);
    });

    // Invalidate dependent caches
    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'detail', companyRecruiterId),
    );
  }

  // ===== JOB REQUIREMENT MANAGEMENT =====

  /**
   * Create a new job requirement for a specific job posting.
   */
  async createJobRequirement(
    companyRecruiterId: string,
    jobId: string,
    dto: CreateJobRequirementDto,
  ): Promise<JobRequirementData> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only add requirements to your own job postings.');
    }

    const requirement = this.jobRequirementRepository.create({
      jobId,
      label: dto.label,
      detail: dto.detail,
    });

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobRequirement) : this.jobRequirementRepository;
      return repo.save(requirement);
    });

    // Invalidate dependent caches
    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));

    return {
      id: saved.id,
      jobId: saved.jobId,
      label: saved.label,
      detail: saved.detail,
      createdAt: saved.createdAt!,
      updatedAt: saved.updatedAt!,
    };
  }

  /**
   * Get all job requirements for a specific job posting.
   */
  async getJobRequirements(
    companyRecruiterId: string,
    jobId: string,
  ): Promise<JobRequirementData[]> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only access requirements for your own job postings.');
    }

    const requirements = await this.jobRequirementRepository.find({
      where: { jobId },
      order: { createdAt: 'DESC' },
    });

    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));

    return requirements.map((req) => ({
      id: req.id,
      jobId: req.jobId,
      label: req.label,
      detail: req.detail,
      createdAt: req.createdAt!,
      updatedAt: req.updatedAt!,
    }));
  }

  /**
   * Update a job requirement.
   */
  async updateJobRequirement(
    companyRecruiterId: string,
    jobId: string,
    requirementId: string,
    dto: UpdateJobRequirementDto,
  ): Promise<JobRequirementData> {
    const requirement = await this.jobRequirementRepository.findOne({
      where: { id: requirementId, jobId },
      relations: ['job'],
    });

    if (!requirement) {
      throw new NotFoundException('Job requirement not found.');
    }

    if (requirement.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only update requirements for your own job postings.');
    }

    if (dto.label !== undefined) requirement.label = dto.label;
    if (dto.detail !== undefined) requirement.detail = dto.detail;

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobRequirement) : this.jobRequirementRepository;
      return repo.save(requirement);
    });

    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));

    return {
      id: saved.id,
      jobId: saved.jobId,
      label: saved.label,
      detail: saved.detail,
      createdAt: saved.createdAt!,
      updatedAt: saved.updatedAt!,
    };
  }

  /**
   * Delete a job requirement.
   */
  async deleteJobRequirement(
    companyRecruiterId: string,
    jobId: string,
    requirementId: string,
  ): Promise<void> {
    const requirement = await this.jobRequirementRepository.findOne({
      where: { id: requirementId, jobId },
      relations: ['job'],
    });

    if (!requirement) {
      throw new NotFoundException('Job requirement not found.');
    }

    if (requirement.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only delete requirements for your own job postings.');
    }

    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobRequirement) : this.jobRequirementRepository;
      await repo.remove(requirement);
    });

    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'detail', companyRecruiterId),
    );
  }

  // ===== JOB SKILL MANAGEMENT =====

  /**
   * Create a new job skill for a specific job posting.
   */
  async createJobSkill(
    companyRecruiterId: string,
    jobId: string,
    dto: CreateJobSkillDto,
  ): Promise<JobSkillData> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only add skills to your own job postings.');
    }

    const skill = this.jobSkillRepository.create({
      jobId,
      skillName: dto.skillName,
      priority: dto.priority,
      proficiency: dto.proficiency,
    });

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobSkill) : this.jobSkillRepository;
      return repo.save(skill);
    });

    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));

    return {
      id: saved.id,
      jobId: saved.jobId,
      skillName: saved.skillName,
      priority: saved.priority,
      proficiency: saved.proficiency,
      createdAt: saved.createdAt!,
      updatedAt: saved.updatedAt!,
    };
  }

  /**
   * Get all job skills for a specific job posting.
   */
  async getJobSkills(companyRecruiterId: string, jobId: string): Promise<JobSkillData[]> {
    const jobPosting = await this.jobPostingRepository.findOne({
      where: { id: jobId },
    });

    if (!jobPosting) {
      throw new NotFoundException('Job posting not found.');
    }

    if (jobPosting.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only access skills for your own job postings.');
    }

    const skills = await this.jobSkillRepository.find({
      where: { jobId },
      order: { createdAt: 'DESC' },
    });

    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));

    return skills.map((skill) => ({
      id: skill.id,
      jobId: skill.jobId,
      skillName: skill.skillName,
      priority: skill.priority,
      proficiency: skill.proficiency,
      createdAt: skill.createdAt!,
      updatedAt: skill.updatedAt!,
    }));
  }

  /**
   * Update a job skill.
   */
  async updateJobSkill(
    companyRecruiterId: string,
    jobId: string,
    skillId: string,
    dto: UpdateJobSkillDto,
  ): Promise<JobSkillData> {
    const skill = await this.jobSkillRepository.findOne({
      where: { id: skillId, jobId },
      relations: ['job'],
    });

    if (!skill) {
      throw new NotFoundException('Job skill not found.');
    }

    if (skill.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only update skills for your own job postings.');
    }

    if (dto.skillName !== undefined) skill.skillName = dto.skillName;
    if (dto.priority !== undefined) skill.priority = dto.priority;
    if (dto.proficiency !== undefined) skill.proficiency = dto.proficiency;

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobSkill) : this.jobSkillRepository;
      return repo.save(skill);
    });

    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));

    return {
      id: saved.id,
      jobId: saved.jobId,
      skillName: saved.skillName,
      priority: saved.priority,
      proficiency: saved.proficiency,
      createdAt: saved.createdAt!,
      updatedAt: saved.updatedAt!,
    };
  }

  /**
   * Delete a job skill.
   */
  async deleteJobSkill(companyRecruiterId: string, jobId: string, skillId: string): Promise<void> {
    const skill = await this.jobSkillRepository.findOne({
      where: { id: skillId, jobId },
      relations: ['job'],
    });

    if (!skill) {
      throw new NotFoundException('Job skill not found.');
    }

    if (skill.job.recruiterId !== companyRecruiterId) {
      throw new ForbiddenException('You can only delete skills for your own job postings.');
    }

    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(JobSkill) : this.jobSkillRepository;
      await repo.remove(skill);
    });

    await this.cache.invalidateIndex(buildCacheKey('idx', 'jobs', 'public', 'list'));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'jobs', 'public', 'list'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/job-posting/public'));
    await this.cache.del(buildCacheKey('jobs', 'public', 'detail', jobId));
    await this.cache.del(buildCacheKey('jobs', 'recruiter', 'detail', companyRecruiterId, jobId));
    await this.cache.invalidateIndex(
      buildCacheKey('idx', 'http', 'jobs', 'recruiter', 'detail', companyRecruiterId),
    );
  }
}
