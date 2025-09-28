import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { JobPostingService } from '../../src/job-posting/job-posting.service';
import { JobPosting } from '../../src/entities/job-posting.entity';
import { Company } from '../../src/entities/company.entity';
import { CompanyRecruiter } from '../../src/entities/company-recruiter.entity';
import { JobBenefit } from '../../src/entities/job-benefit.entity';
import { JobRequirement } from '../../src/entities/job-requirement.entity';
import { JobSkill } from '../../src/entities/job-skill.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { CreateJobPostingDto } from '../../src/job-posting/dto/create-job-posting.dto';
import type { UpdateJobPostingDto } from '../../src/job-posting/dto/update-job-posting.dto';
import type { CreateJobBenefitDto } from '../../src/job-posting/dto/create-job-benefit.dto';
import type { UpdateJobBenefitDto } from '../../src/job-posting/dto/update-job-benefit.dto';
import type { CreateJobRequirementDto } from '../../src/job-posting/dto/create-job-requirement.dto';
import type { UpdateJobRequirementDto } from '../../src/job-posting/dto/update-job-requirement.dto';
import type { CreateJobSkillDto } from '../../src/job-posting/dto/create-job-skill.dto';
import type { UpdateJobSkillDto } from '../../src/job-posting/dto/update-job-skill.dto';
import { SkillPriority } from '../../src/utils/enums/skill-priority.enum';
import { CacheHelperService } from '../../src/utils/cache/cache.service';

const mockRecruiterId = 'rec-1';
const mockCompanyId = 'comp-1';
const mockJobId = 'job-1';

const makeJobPosting = (overrides: Partial<JobPosting> = {}): JobPosting => {
  const j = new JobPosting();
  Object.assign(j, {
    id: mockJobId,
    companyId: mockCompanyId,
    recruiterId: mockRecruiterId,
    title: 'Engineer',
    slug: 'engineer',
    description: 'Desc',
    isPublished: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    ...overrides,
  });
  (j as any).company = Object.assign(new Company(), {
    id: mockCompanyId,
    name: 'Acme',
  });
  return j;
};

describe('JobPostingService', () => {
  let service: JobPostingService;
  let jobPostingRepo: jest.Mocked<Repository<JobPosting>>;
  let companyRepo: jest.Mocked<Repository<Company>>;
  let recruiterRepo: jest.Mocked<Repository<CompanyRecruiter>>;
  let benefitRepo: jest.Mocked<Repository<JobBenefit>>;
  let requirementRepo: jest.Mocked<Repository<JobRequirement>>;
  let skillRepo: jest.Mocked<Repository<JobSkill>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostingService,
        {
          provide: CacheHelperService,
          useValue: {
            getOrSet: jest.fn((_k: string, supplier: any) => supplier()),
            rememberList: jest.fn((_idx: string, _k: string, supplier: any) => supplier()),
            trackKey: jest.fn(),
            invalidateIndex: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobPosting),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        { provide: getRepositoryToken(Company), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(CompanyRecruiter), useValue: { findOne: jest.fn() } },
        {
          provide: getRepositoryToken(JobBenefit),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobRequirement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobSkill),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(JobPostingService);
    jobPostingRepo = module.get(getRepositoryToken(JobPosting));
    companyRepo = module.get(getRepositoryToken(Company));
    recruiterRepo = module.get(getRepositoryToken(CompanyRecruiter));
    benefitRepo = module.get(getRepositoryToken(JobBenefit));
    requirementRepo = module.get(getRepositoryToken(JobRequirement));
    skillRepo = module.get(getRepositoryToken(JobSkill));
  });

  afterEach(() => jest.clearAllMocks());

  describe('createJobPosting', () => {
    it('creates a job posting with generated slug', async () => {
      const dto: CreateJobPostingDto = {
        title: 'Senior Engineer',
        description: 'Desc',
      } as unknown as CreateJobPostingDto;
      const mapping = Object.assign(new CompanyRecruiter(), {
        id: mockRecruiterId,
        companyId: mockCompanyId,
      });
      (recruiterRepo.findOne as jest.Mock).mockResolvedValue(mapping);
      (jobPostingRepo.create as jest.Mock).mockImplementation((v) => makeJobPosting(v));
      (jobPostingRepo.save as jest.Mock).mockImplementation((e) => e);

      const result = await service.createJobPosting(mockRecruiterId, dto);
      expect(recruiterRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockRecruiterId },
        relations: ['company'],
      });
      expect(result.title).toBe('Senior Engineer');
      expect(result.slug).toContain('senior-engineer');
    });

    it('throws NotFound when recruiter mapping missing', async () => {
      (recruiterRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.createJobPosting(mockRecruiterId, { title: 'T', description: 'D' } as any),
      ).rejects.toThrow(new NotFoundException('Recruiter mapping not found.'));
    });
  });

  describe('slug generation', () => {
    it('increments slug when collision occurs on create', async () => {
      const dto: CreateJobPostingDto = {
        title: 'Senior Engineer',
        description: 'Desc',
      } as unknown as CreateJobPostingDto;
      const mapping = Object.assign(new CompanyRecruiter(), {
        id: mockRecruiterId,
        companyId: mockCompanyId,
      });
      (recruiterRepo.findOne as jest.Mock).mockResolvedValue(mapping);
      // First slug exists, second does not
      (jobPostingRepo.findOne as jest.Mock)
        .mockImplementationOnce(() => ({ id: 'other' }))
        .mockImplementationOnce(() => null);
      (jobPostingRepo.create as jest.Mock).mockImplementation((v) => makeJobPosting(v));
      (jobPostingRepo.save as jest.Mock).mockImplementation((e) => e);

      const result = await service.createJobPosting(mockRecruiterId, dto);
      expect(result.slug).toBe('senior-engineer-1');
    });

    it('keeps same slug on update when duplicate belongs to same job (excludeId)', async () => {
      const existing = makeJobPosting({ slug: 'senior-engineer' });
      // First call: load job by id
      (jobPostingRepo.findOne as jest.Mock)
        .mockImplementationOnce(() => existing)
        // Inside generateUniqueSlug: found same slug but same id -> break
        .mockImplementationOnce(() => ({ id: mockJobId }));
      (jobPostingRepo.save as jest.Mock).mockImplementation((e) => e);

      const updated = await service.updateJobPosting(mockRecruiterId, mockJobId, {
        title: 'Senior Engineer',
      } as UpdateJobPostingDto);
      expect(updated.slug).toBe('senior-engineer');
    });
  });

  describe('getRecruiterJobPostings', () => {
    it('returns paginated recruiter postings', async () => {
      const job = makeJobPosting();
      (jobPostingRepo.findAndCount as jest.Mock).mockResolvedValue([[job], 1]);
      const result = await service.getRecruiterJobPostings(mockRecruiterId, 1, 10);
      expect(result.totalData).toBe(1);
      expect(result.data[0].id).toBe(mockJobId);
    });
  });

  describe('deleteJobPosting', () => {
    it('removes when owner matches', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(makeJobPosting());
      (jobPostingRepo.remove as jest.Mock).mockResolvedValue({});
      await expect(service.deleteJobPosting(mockRecruiterId, mockJobId)).resolves.toBeUndefined();
      expect(jobPostingRepo.remove).toHaveBeenCalled();
    });

    it('throws NotFound when missing', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteJobPosting(mockRecruiterId, mockJobId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getRecruiterJobPosting', () => {
    it('returns full job with relations', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(makeJobPosting());
      (benefitRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobBenefit(), {
          id: 'b1',
          jobId: mockJobId,
          label: 'Health',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);
      (requirementRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobRequirement(), {
          id: 'r1',
          jobId: mockJobId,
          label: 'Bachelor',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);
      (skillRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobSkill(), {
          id: 's1',
          jobId: mockJobId,
          skillName: 'TS',
          priority: SkillPriority.CORE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);
      const result = await service.getRecruiterJobPosting(mockRecruiterId, mockJobId);
      expect(result.id).toBe(mockJobId);
      expect(result.company.id).toBe(mockCompanyId);
      expect(result.benefits[0].id).toBe('b1');
    });

    it('throws NotFound when job missing', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getRecruiterJobPosting(mockRecruiterId, mockJobId)).rejects.toThrow(
        new NotFoundException('Job posting not found.'),
      );
    });

    it('throws Forbidden when not owner', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(
        makeJobPosting({ recruiterId: 'other' }),
      );
      await expect(service.getRecruiterJobPosting(mockRecruiterId, mockJobId)).rejects.toThrow(
        new ForbiddenException('You can only access your own job postings.'),
      );
    });
  });

  describe('updateJobPosting', () => {
    it('updates allowed fields and returns projection', async () => {
      const existing = makeJobPosting();
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (jobPostingRepo.save as jest.Mock).mockImplementation((e) => e);
      const dto: UpdateJobPostingDto = {
        title: 'New Title',
        isPublished: true,
      } as UpdateJobPostingDto;
      const updated = await service.updateJobPosting(mockRecruiterId, mockJobId, dto);
      expect(updated.title).toBe('New Title');
      expect(updated.isPublished).toBe(true);
    });

    it('throws NotFound when updating non-existent job', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateJobPosting(mockRecruiterId, mockJobId, { title: 'X' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Forbidden when updating job not owned', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(
        makeJobPosting({ recruiterId: 'other' }),
      );
      await expect(
        service.updateJobPosting(mockRecruiterId, mockJobId, { title: 'X' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('public listing and details', () => {
    it('lists published jobs with filters and pagination', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[makeJobPosting()], 1]),
      };
      (jobPostingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (benefitRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobBenefit(), {
          id: 'b1',
          jobId: mockJobId,
          label: 'Health',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);
      (requirementRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobRequirement(), {
          id: 'r1',
          jobId: mockJobId,
          label: 'Bachelor',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);
      (skillRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobSkill(), {
          id: 's1',
          jobId: mockJobId,
          skillName: 'TS',
          priority: SkillPriority.CORE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);

      const result = await service.getPublishedJobPostings(
        {
          query: 'eng',
          employmentType: 'full_time' as any,
          workLocationType: 'remote' as any,
          companyId: mockCompanyId,
          salaryMin: 100,
          salaryMax: 200,
          salaryCurrency: 'USD' as any,
        },
        1,
        10,
      );

      expect(qb.where).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalled();
      expect(result.totalData).toBe(1);
      expect(result.data[0].company.id).toBe(mockCompanyId);
    });

    it('gets a published job by id or slug', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(makeJobPosting());
      (benefitRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobBenefit(), {
          id: 'b1',
          jobId: mockJobId,
          label: 'Health',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);
      (requirementRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobRequirement(), {
          id: 'r1',
          jobId: mockJobId,
          label: 'Bachelor',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);
      (skillRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobSkill(), {
          id: 's1',
          jobId: mockJobId,
          skillName: 'TS',
          priority: SkillPriority.CORE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ]);
      const byId = await service.getPublishedJobPosting('job-1');
      expect(byId.id).toBe(mockJobId);
    });

    it('throws NotFound when published job missing', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getPublishedJobPosting('missing')).rejects.toThrow(
        new NotFoundException('Job posting not found or not published.'),
      );
    });
  });

  describe('benefits CRUD', () => {
    it('creates, lists, updates, and deletes benefits', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(makeJobPosting());
      const benefit = Object.assign(new JobBenefit(), {
        id: 'b1',
        jobId: mockJobId,
        label: 'Health',
        description: 'Desc',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (benefitRepo.create as jest.Mock).mockReturnValue(benefit);
      (benefitRepo.save as jest.Mock).mockResolvedValue(benefit);
      const created = await service.createJobBenefit(mockRecruiterId, mockJobId, {
        label: 'Health',
      } as CreateJobBenefitDto);
      expect(created.label).toBe('Health');

      (benefitRepo.find as jest.Mock).mockResolvedValue([benefit]);
      const list = await service.getJobBenefits(mockRecruiterId, mockJobId);
      expect(list).toHaveLength(1);

      (benefitRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(benefit, { job: makeJobPosting() }),
      );
      const updated = await service.updateJobBenefit(mockRecruiterId, mockJobId, 'b1', {
        label: 'New',
      } as UpdateJobBenefitDto);
      expect(updated.label).toBe('New');

      await service.deleteJobBenefit(mockRecruiterId, mockJobId, 'b1');
      expect(benefitRepo.remove).toHaveBeenCalled();
    });

    it('throws NotFound and Forbidden on create benefit', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.createJobBenefit(mockRecruiterId, mockJobId, { label: 'L' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);

      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(
        makeJobPosting({ recruiterId: 'other' }),
      );
      await expect(
        service.createJobBenefit(mockRecruiterId, mockJobId, { label: 'L' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFound and Forbidden on list benefits', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getJobBenefits(mockRecruiterId, mockJobId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(
        makeJobPosting({ recruiterId: 'other' }),
      );
      await expect(service.getJobBenefits(mockRecruiterId, mockJobId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws NotFound and Forbidden on update and delete benefit', async () => {
      // update not found
      (benefitRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateJobBenefit(mockRecruiterId, mockJobId, 'b1', {} as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      // update forbidden
      (benefitRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobBenefit(), { id: 'b1', job: { recruiterId: 'other' } }),
      );
      await expect(
        service.updateJobBenefit(mockRecruiterId, mockJobId, 'b1', {} as any),
      ).rejects.toBeInstanceOf(ForbiddenException);

      // delete not found
      (benefitRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.deleteJobBenefit(mockRecruiterId, mockJobId, 'b1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      // delete forbidden
      (benefitRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobBenefit(), { id: 'b1', job: { recruiterId: 'other' } }),
      );
      await expect(
        service.deleteJobBenefit(mockRecruiterId, mockJobId, 'b1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('requirements CRUD', () => {
    it('creates, lists, updates, and deletes requirements', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(makeJobPosting());
      const req = Object.assign(new JobRequirement(), {
        id: 'r1',
        jobId: mockJobId,
        label: 'Bachelor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (requirementRepo.create as jest.Mock).mockReturnValue(req);
      (requirementRepo.save as jest.Mock).mockResolvedValue(req);
      const created = await service.createJobRequirement(mockRecruiterId, mockJobId, {
        label: 'Bachelor',
      } as CreateJobRequirementDto);
      expect(created.label).toBe('Bachelor');

      (requirementRepo.find as jest.Mock).mockResolvedValue([req]);
      const list = await service.getJobRequirements(mockRecruiterId, mockJobId);
      expect(list).toHaveLength(1);

      (requirementRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(req, { job: makeJobPosting() }),
      );
      const updated = await service.updateJobRequirement(mockRecruiterId, mockJobId, 'r1', {
        label: 'Master',
      } as UpdateJobRequirementDto);
      expect(updated.label).toBe('Master');

      await service.deleteJobRequirement(mockRecruiterId, mockJobId, 'r1');
      expect(requirementRepo.remove).toHaveBeenCalled();
    });

    it('update/delete requirement throws NotFound/Forbidden', async () => {
      (requirementRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateJobRequirement(mockRecruiterId, mockJobId, 'r1', {} as any),
      ).rejects.toBeInstanceOf(NotFoundException);

      (requirementRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobRequirement(), { id: 'r1', job: { recruiterId: 'other' } }),
      );
      await expect(
        service.updateJobRequirement(mockRecruiterId, mockJobId, 'r1', {} as any),
      ).rejects.toBeInstanceOf(ForbiddenException);

      (requirementRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.deleteJobRequirement(mockRecruiterId, mockJobId, 'r1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      (requirementRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobRequirement(), { id: 'r1', job: { recruiterId: 'other' } }),
      );
      await expect(
        service.deleteJobRequirement(mockRecruiterId, mockJobId, 'r1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('skills CRUD', () => {
    it('creates, lists, updates, and deletes skills', async () => {
      (jobPostingRepo.findOne as jest.Mock).mockResolvedValue(makeJobPosting());
      const skill = Object.assign(new JobSkill(), {
        id: 's1',
        jobId: mockJobId,
        skillName: 'TypeScript',
        priority: SkillPriority.CORE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (skillRepo.create as jest.Mock).mockReturnValue(skill);
      (skillRepo.save as jest.Mock).mockResolvedValue(skill);
      const created = await service.createJobSkill(mockRecruiterId, mockJobId, {
        skillName: 'TypeScript',
        priority: SkillPriority.CORE,
      } as CreateJobSkillDto);
      expect(created.skillName).toBe('TypeScript');

      (skillRepo.find as jest.Mock).mockResolvedValue([skill]);
      const list = await service.getJobSkills(mockRecruiterId, mockJobId);
      expect(list).toHaveLength(1);

      (skillRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(skill, { job: makeJobPosting() }),
      );
      const updated = await service.updateJobSkill(mockRecruiterId, mockJobId, 's1', {
        skillName: 'TS',
      } as UpdateJobSkillDto);
      expect(updated.skillName).toBe('TS');

      await service.deleteJobSkill(mockRecruiterId, mockJobId, 's1');
      expect(skillRepo.remove).toHaveBeenCalled();
    });

    it('update/delete skill throws NotFound/Forbidden', async () => {
      (skillRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateJobSkill(mockRecruiterId, mockJobId, 's1', {} as any),
      ).rejects.toBeInstanceOf(NotFoundException);

      (skillRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobSkill(), { id: 's1', job: { recruiterId: 'other' } }),
      );
      await expect(
        service.updateJobSkill(mockRecruiterId, mockJobId, 's1', {} as any),
      ).rejects.toBeInstanceOf(ForbiddenException);

      (skillRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteJobSkill(mockRecruiterId, mockJobId, 's1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      (skillRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobSkill(), { id: 's1', job: { recruiterId: 'other' } }),
      );
      await expect(service.deleteJobSkill(mockRecruiterId, mockJobId, 's1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
