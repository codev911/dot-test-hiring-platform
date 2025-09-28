import { Test, TestingModule } from '@nestjs/testing';
import { CacheHelperService } from '../../src/utils/cache/cache.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { JobApplicationService } from '../../src/job-application/job-application.service';
import { JobApplication } from '../../src/entities/job-application.entity';
import { JobPosting } from '../../src/entities/job-posting.entity';
import { User } from '../../src/entities/user.entity';
import { UserResume } from '../../src/entities/user-resume.entity';
import { JobApplicationEvent } from '../../src/entities/job-application-event.entity';
import { JobApplicationNote } from '../../src/entities/job-application-note.entity';
import { CompanyRecruiter } from '../../src/entities/company-recruiter.entity';
import { ApplicationStatus } from '../../src/utils/enums/application-status.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';

const candidateId = 'u1';
const jobId = 'j1';
const appId = 'a1';

const makeApplication = (overrides: Partial<JobApplication> = {}): JobApplication => {
  const a = new JobApplication();
  Object.assign(a, {
    id: appId,
    jobId,
    candidateId,
    status: ApplicationStatus.APPLIED,
    submittedAt: new Date('2024-01-03'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    ...overrides,
  });
  (a as any).job = Object.assign(new JobPosting(), {
    id: jobId,
    recruiterId: 'rec1',
    title: 'Engineer',
    company: { name: 'Acme' },
  });
  (a as any).candidate = Object.assign(new User(), {
    id: candidateId,
    firstName: 'John',
    lastName: 'D',
    email: 'john@example.com',
  });
  return a;
};

describe('JobApplicationService', () => {
  let service: JobApplicationService;
  let applicationRepo: jest.Mocked<Repository<JobApplication>>;
  let postingRepo: jest.Mocked<Repository<JobPosting>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let resumeRepo: jest.Mocked<Repository<UserResume>>;
  let eventRepo: jest.Mocked<Repository<JobApplicationEvent>>;
  let noteRepo: jest.Mocked<Repository<JobApplicationNote>>;
  let recruiterRepo: jest.Mocked<Repository<CompanyRecruiter>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationService,
        {
          provide: getRepositoryToken(JobApplication),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CacheHelperService,
          useValue: {
            getOrSet: jest.fn((_k: string, s: any) => s()),
            rememberList: jest.fn((_idx: string, _k: string, s: any) => s()),
            trackKey: jest.fn(),
            invalidateIndex: jest.fn(),
            del: jest.fn(),
          },
        },
        { provide: getRepositoryToken(JobPosting), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(UserResume), useValue: { findOne: jest.fn() } },
        {
          provide: getRepositoryToken(JobApplicationEvent),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(JobApplicationNote),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() },
        },
        { provide: getRepositoryToken(CompanyRecruiter), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get(JobApplicationService);
    applicationRepo = module.get(getRepositoryToken(JobApplication));
    postingRepo = module.get(getRepositoryToken(JobPosting));
    userRepo = module.get(getRepositoryToken(User));
    resumeRepo = module.get(getRepositoryToken(UserResume));
    eventRepo = module.get(getRepositoryToken(JobApplicationEvent));
    noteRepo = module.get(getRepositoryToken(JobApplicationNote));
    recruiterRepo = module.get(getRepositoryToken(CompanyRecruiter));
  });

  afterEach(() => jest.clearAllMocks());

  describe('createJobApplication', () => {
    it('creates application and initial event', async () => {
      (postingRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobPosting(), { id: jobId, isPublished: true }),
      );
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      (applicationRepo.create as jest.Mock).mockImplementation((v) =>
        Object.assign(new JobApplication(), v),
      );
      (applicationRepo.save as jest.Mock).mockImplementation((a) =>
        Promise.resolve(Object.assign(makeApplication(), a, { id: appId })),
      );
      (eventRepo.create as jest.Mock).mockImplementation((v) =>
        Object.assign(new JobApplicationEvent(), v),
      );
      (eventRepo.save as jest.Mock).mockResolvedValue(
        Object.assign(new JobApplicationEvent(), { id: 'e1' }),
      );
      const result = await service.createJobApplication(candidateId, { jobId } as any);
      expect(result.id).toBe(appId);
      expect(applicationRepo.save).toHaveBeenCalled();
      expect(eventRepo.save).toHaveBeenCalled();
    });

    it('throws Conflict when already applied', async () => {
      (postingRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobPosting(), { id: jobId, isPublished: true }),
      );
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(makeApplication());
      await expect(service.createJobApplication(candidateId, { jobId } as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFound when posting missing', async () => {
      (postingRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.createJobApplication(candidateId, { jobId } as any)).rejects.toThrow(
        new NotFoundException('Job posting not found.'),
      );
    });

    it('throws BadRequest when posting not published', async () => {
      (postingRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobPosting(), { id: jobId, isPublished: false }),
      );
      await expect(
        service.createJobApplication(candidateId, { jobId } as any),
      ).rejects.toBeInstanceOf(Error);
    });

    it('auto-selects latest resume if available and continues when none', async () => {
      (postingRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobPosting(), { id: jobId, isPublished: true }),
      );
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      // no resume found
      (resumeRepo.findOne as jest.Mock).mockResolvedValue(null);
      (applicationRepo.create as jest.Mock).mockImplementation((v) =>
        Object.assign(new JobApplication(), v),
      );
      (applicationRepo.save as jest.Mock).mockImplementation((a) =>
        Promise.resolve(Object.assign(makeApplication(), a, { id: appId })),
      );
      (eventRepo.create as jest.Mock).mockImplementation((v) =>
        Object.assign(new JobApplicationEvent(), v),
      );
      (eventRepo.save as jest.Mock).mockResolvedValue(
        Object.assign(new JobApplicationEvent(), { id: 'e1' }),
      );
      const result = await service.createJobApplication(candidateId, { jobId } as any);
      expect(result.id).toBe(appId);
      expect(applicationRepo.save).toHaveBeenCalled();
    });
  });

  describe('getCandidateApplications', () => {
    it('returns paginated applications for candidate', async () => {
      (applicationRepo.findAndCount as jest.Mock).mockResolvedValue([[makeApplication()], 1]);
      const result = await service.getCandidateApplications(candidateId, 1, 10);
      expect(result.totalData).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('withdrawApplication', () => {
    it('withdraws application and records event', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        makeApplication({ status: ApplicationStatus.APPLIED }),
      );
      (applicationRepo.save as jest.Mock).mockImplementation((a) =>
        Promise.resolve(a as JobApplication),
      );
      (eventRepo.create as jest.Mock).mockImplementation((v) =>
        Object.assign(new JobApplicationEvent(), v),
      );
      (eventRepo.save as jest.Mock).mockResolvedValue(
        Object.assign(new JobApplicationEvent(), { id: 'e2' }),
      );
      const result = await service.withdrawApplication('u1', 'a1');
      expect(result.status).toBe(ApplicationStatus.WITHDRAWN);
      expect(eventRepo.save).toHaveBeenCalled();
    });

    it('throws when already withdrawn', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        makeApplication({ status: ApplicationStatus.WITHDRAWN }),
      );
      await expect(service.withdrawApplication('u1', 'a1')).rejects.toThrow();
    });
  });

  describe('other service methods', () => {
    it('getCandidateApplication returns application when owner matches', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(makeApplication());
      const result = await service.getCandidateApplication('u1', 'a1');
      expect(result.id).toBe('a1');
    });

    it('getCandidateApplication throws when not owner', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        makeApplication({ candidateId: 'u2' } as any),
      );
      await expect(service.getCandidateApplication('u1', 'a1')).rejects.toBeInstanceOf(Error);
    });

    it('getCandidateApplication throws NotFound when missing', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getCandidateApplication('u1', 'a1')).rejects.toBeInstanceOf(Error);
    });

    it('getJobApplications returns paginated for recruiter job', async () => {
      (postingRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobPosting(), { id: 'j1', recruiterId: 'rec1' }),
      );
      (applicationRepo.findAndCount as jest.Mock).mockResolvedValue([[makeApplication()], 1]);
      const result = await service.getJobApplications('rec1', 'j1', 1, 10);
      expect(result.totalData).toBe(1);
    });

    it('getJobApplications throws when job missing or not owner', async () => {
      (postingRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getJobApplications('rec1', 'j1', 1, 10)).rejects.toBeInstanceOf(Error);
      (postingRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobPosting(), { id: 'j1', recruiterId: 'other' }),
      );
      await expect(service.getJobApplications('rec1', 'j1', 1, 10)).rejects.toBeInstanceOf(Error);
    });

    it('withdrawApplication throws when missing, not owner, or hired', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.withdrawApplication('u1', 'a1')).rejects.toBeInstanceOf(Error);

      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        makeApplication({ candidateId: 'u2' } as any),
      );
      await expect(service.withdrawApplication('u1', 'a1')).rejects.toBeInstanceOf(Error);

      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        makeApplication({ status: ApplicationStatus.HIRED }),
      );
      await expect(service.withdrawApplication('u1', 'a1')).rejects.toBeInstanceOf(Error);
    });

    it('getRecruiterApplication returns application for recruiter owner', async () => {
      const app = makeApplication();
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(app);
      const result = await service.getRecruiterApplication('rec1', 'a1');
      expect(result.id).toBe('a1');
    });

    it('getRecruiterApplication throws when not owner', async () => {
      const app = makeApplication();
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(app, { job: { recruiterId: 'other' } }),
      );
      await expect(service.getRecruiterApplication('rec1', 'a1')).rejects.toBeInstanceOf(Error);
    });

    it('updateApplicationStatus persists event and returns it', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(makeApplication(), { job: { recruiterId: 'rec1' } }),
      );
      (eventRepo.create as jest.Mock).mockImplementation((v) =>
        Object.assign(new JobApplicationEvent(), v),
      );
      (eventRepo.save as jest.Mock).mockResolvedValue(
        Object.assign(new JobApplicationEvent(), { id: 'e3' }),
      );
      const result = await service.updateApplicationStatus('rec1', 'a1', {
        status: ApplicationStatus.INTERVIEW,
      } as any);
      expect(result.id).toBe('e3');
    });

    it('updateApplicationStatus throws NotFound/Forbidden', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateApplicationStatus('rec1', 'a1', {
          status: ApplicationStatus.INTERVIEW,
        } as any),
      ).rejects.toBeInstanceOf(Error);

      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(makeApplication(), { job: { recruiterId: 'other' } }),
      );
      await expect(
        service.updateApplicationStatus('rec1', 'a1', {
          status: ApplicationStatus.INTERVIEW,
        } as any),
      ).rejects.toBeInstanceOf(Error);
    });

    it('addApplicationNote adds note and returns with author', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(makeApplication(), { job: { recruiterId: 'rec1' } }),
      );
      (noteRepo.create as jest.Mock).mockImplementation((v) =>
        Object.assign(new JobApplicationNote(), v),
      );
      (noteRepo.save as jest.Mock).mockResolvedValue(
        Object.assign(new JobApplicationNote(), { id: 'n1' }),
      );
      (noteRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(new JobApplicationNote(), {
          id: 'n1',
          author: { recruiterIdRel: { id: 'rec1', firstName: 'Rick', lastName: 'Rito' } },
        }),
      );
      const result = await service.addApplicationNote('rec1', 'a1', { note: 'Nice' } as any);
      expect(result.id).toBe('n1');
      expect(result.author.firstName).toBe('Rick');
    });

    it('getApplicationNotes returns array of notes', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(makeApplication(), { job: { recruiterId: 'rec1' } }),
      );
      (noteRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobApplicationNote(), {
          id: 'n1',
          author: { recruiterIdRel: { id: 'rec1', firstName: 'Rick' } },
        }),
      ]);
      const result = await service.getApplicationNotes('rec1', 'a1');
      expect(result.length).toBe(1);
    });

    it('getApplicationEvents returns array of events', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        Object.assign(makeApplication(), { job: { recruiterId: 'rec1' } }),
      );
      (eventRepo.find as jest.Mock).mockResolvedValue([
        Object.assign(new JobApplicationEvent(), { id: 'e1' }),
      ]);
      const result = await service.getApplicationEvents('rec1', 'a1');
      expect(result.length).toBe(1);
    });

    it('getRecruiterApplication throws NotFound when missing', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getRecruiterApplication('rec1', 'a1')).rejects.toBeInstanceOf(Error);
    });

    it('addApplicationNote throws when missing or not owner', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.addApplicationNote('rec1', 'a1', { note: 'x' } as any),
      ).rejects.toBeInstanceOf(Error);

      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        makeApplication({ job: { recruiterId: 'other' } } as any),
      );
      await expect(
        service.addApplicationNote('rec1', 'a1', { note: 'x' } as any),
      ).rejects.toBeInstanceOf(Error);
    });

    it('getApplicationNotes and getApplicationEvents throw when missing or not owner', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getApplicationNotes('rec1', 'a1')).rejects.toBeInstanceOf(Error);
      await expect(service.getApplicationEvents('rec1', 'a1')).rejects.toBeInstanceOf(Error);

      (applicationRepo.findOne as jest.Mock).mockResolvedValue(
        makeApplication({ job: { recruiterId: 'other' } } as any),
      );
      await expect(service.getApplicationNotes('rec1', 'a1')).rejects.toBeInstanceOf(Error);
      await expect(service.getApplicationEvents('rec1', 'a1')).rejects.toBeInstanceOf(Error);
    });
  });
});
