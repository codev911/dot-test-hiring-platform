import { JobPostingController } from '../../src/job-posting/job-posting.controller';
import type { JobPostingService } from '../../src/job-posting/job-posting.service';
import type {
  JobPostingData,
  PaginatedJobPostingsData,
  JobBenefitData,
  JobRequirementData,
  JobSkillData,
} from '../../src/utils/types/job.type';

describe('JobPostingController', () => {
  let controller: JobPostingController;
  let service: jest.Mocked<JobPostingService>;

  const job: JobPostingData = {
    id: '1',
    companyId: 'c1',
    recruiterId: 'r1',
    title: 'Engineer',
    slug: 'engineer',
    description: 'desc',
    employmentType: undefined as any,
    workLocationType: undefined as any,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = {
      createJobPosting: jest.fn(),
      getRecruiterJobPostings: jest.fn(),
      getRecruiterJobPosting: jest.fn(),
      updateJobPosting: jest.fn(),
      deleteJobPosting: jest.fn(),
      getPublishedJobPostings: jest.fn(),
      getPublishedJobPosting: jest.fn(),
      createJobBenefit: jest.fn(),
      getJobBenefits: jest.fn(),
      updateJobBenefit: jest.fn(),
      deleteJobBenefit: jest.fn(),
      createJobRequirement: jest.fn(),
      getJobRequirements: jest.fn(),
      updateJobRequirement: jest.fn(),
      deleteJobRequirement: jest.fn(),
      createJobSkill: jest.fn(),
      getJobSkills: jest.fn(),
      updateJobSkill: jest.fn(),
      deleteJobSkill: jest.fn(),
    } as unknown as jest.Mocked<JobPostingService>;
    controller = new JobPostingController(service);
  });

  afterEach(() => jest.clearAllMocks());

  it('createJobPosting returns message and data', async () => {
    service.createJobPosting.mockResolvedValue(job);
    const result = await controller.createJobPosting(
      { user: { companyRecruiterId: 'r1' } } as any,
      { title: 'Engineer', description: 'desc' } as any,
    );
    expect(service.createJobPosting).toHaveBeenCalled();
    expect(result.message).toBe('Job posting created successfully.');
    expect(result.data.id).toBe('1');
  });

  it('getRecruiterJobPostings returns paginated', async () => {
    const paginated: PaginatedJobPostingsData = {
      data: [],
      totalData: 0,
      page: 1,
      limit: 10,
      totalPage: 0,
    };
    service.getRecruiterJobPostings.mockResolvedValue(paginated);
    const result = await controller.getRecruiterJobPostings({
      user: { companyRecruiterId: 'r1' },
    } as any);
    expect(result.data.page).toBe(1);
  });

  it('benefit endpoints pipe to service', async () => {
    const benefit: JobBenefitData = {
      id: 'b1',
      jobId: '1',
      label: 'Health',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    service.createJobBenefit.mockResolvedValue(benefit);
    const created = await controller.createJobBenefit(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
      {
        label: 'Health',
      } as any,
    );
    expect(created.data.id).toBe('b1');

    service.getJobBenefits.mockResolvedValue([benefit]);
    const list = await controller.getJobBenefits(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
    );
    expect(list.data).toHaveLength(1);
  });

  it('public listing converts filters and pagination', async () => {
    const paged: PaginatedJobPostingsData = {
      data: [],
      totalData: 0,
      page: 2,
      limit: 5,
      totalPage: 0,
    };
    service.getPublishedJobPostings.mockResolvedValue(paged);
    const result = await controller.getPublishedJobPostings(
      'engineer',
      'Jakarta',
      'full_time' as any,
      'remote' as any,
      '100',
      '200',
      'USD' as any,
      'c1',
      'ts,react',
      '2',
      '5',
    );
    expect(service.getPublishedJobPostings).toHaveBeenCalledWith(
      {
        query: 'engineer',
        location: 'Jakarta',
        employmentType: 'full_time',
        workLocationType: 'remote',
        salaryMin: 100,
        salaryMax: 200,
        salaryCurrency: 'USD',
        companyId: 'c1',
        skills: ['ts', 'react'],
      },
      2,
      5,
    );
    expect(result.data.page).toBe(2);
  });

  it('requirement endpoints pipe to service', async () => {
    const req: JobRequirementData = {
      id: 'r1',
      jobId: '1',
      label: 'Bachelor',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    service.createJobRequirement.mockResolvedValue(req);
    const created = await controller.createJobRequirement(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
      {
        label: 'Bachelor',
      } as any,
    );
    expect(created.data.id).toBe('r1');

    service.getJobRequirements.mockResolvedValue([req]);
    const list = await controller.getJobRequirements(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
    );
    expect(list.data).toHaveLength(1);
  });

  it('skill endpoints pipe to service', async () => {
    const skill: JobSkillData = {
      id: 's1',
      jobId: '1',
      skillName: 'TS',
      priority: 'core' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    service.createJobSkill.mockResolvedValue(skill);
    const created = await controller.createJobSkill(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
      {
        skillName: 'TS',
        priority: 'core' as any,
      } as any,
    );
    expect(created.data.id).toBe('s1');

    service.getJobSkills.mockResolvedValue([skill]);
    const list = await controller.getJobSkills({ user: { companyRecruiterId: 'r1' } } as any, '1');
    expect(list.data).toHaveLength(1);
  });

  it('update and delete flows for posting + children', async () => {
    // posting update
    service.updateJobPosting.mockResolvedValue({ ...job, title: 'Updated' });
    const updRes = await controller.updateJobPosting(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
      { title: 'Updated' } as any,
    );
    expect(updRes.data.title).toBe('Updated');

    // posting get by recruiter
    service.getRecruiterJobPosting.mockResolvedValue({
      ...(job as any),
      company: { id: 'c1', name: 'Acme' },
      benefits: [],
      requirements: [],
      skills: [],
    });
    const one = await controller.getRecruiterJobPosting(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
    );
    expect(one.data.company.id).toBe('c1');

    // posting delete
    service.deleteJobPosting.mockResolvedValue(undefined as any);
    const del = await controller.deleteJobPosting(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
    );
    expect(del.message).toContain('deleted');

    // benefit update/delete
    service.updateJobBenefit.mockResolvedValue({} as any);
    await controller.updateJobBenefit({ user: { companyRecruiterId: 'r1' } } as any, '1', 'b1', {
      label: 'New',
    } as any);
    service.deleteJobBenefit.mockResolvedValue(undefined as any);
    await controller.deleteJobBenefit({ user: { companyRecruiterId: 'r1' } } as any, '1', 'b1');

    // requirement update/delete
    service.updateJobRequirement.mockResolvedValue({} as any);
    await controller.updateJobRequirement(
      { user: { companyRecruiterId: 'r1' } } as any,
      '1',
      'r1',
      { label: 'New' } as any,
    );
    service.deleteJobRequirement.mockResolvedValue(undefined as any);
    await controller.deleteJobRequirement({ user: { companyRecruiterId: 'r1' } } as any, '1', 'r1');

    // skill update/delete
    service.updateJobSkill.mockResolvedValue({} as any);
    await controller.updateJobSkill({ user: { companyRecruiterId: 'r1' } } as any, '1', 's1', {
      skillName: 'TS',
    } as any);
    service.deleteJobSkill.mockResolvedValue(undefined as any);
    await controller.deleteJobSkill({ user: { companyRecruiterId: 'r1' } } as any, '1', 's1');

    // public get detail
    service.getPublishedJobPosting.mockResolvedValue({} as any);
    await controller.getPublishedJobPosting('engineer');
  });
});
