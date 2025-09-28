import { JobApplicationController } from '../../src/job-application/job-application.controller';
import type { JobApplicationService } from '../../src/job-application/job-application.service';
import type {
  JobApplicationData,
  PaginatedJobApplicationsData,
} from '../../src/utils/types/job.type';
import { ApplicationStatus } from '../../src/utils/enums/application-status.enum';

describe('JobApplicationController', () => {
  let controller: JobApplicationController;
  let service: jest.Mocked<JobApplicationService>;

  const app: JobApplicationData = {
    id: 'a1',
    jobId: 'j1',
    candidateId: 'u1',
    status: ApplicationStatus.APPLIED,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(() => {
    service = {
      createJobApplication: jest.fn(),
      getCandidateApplications: jest.fn(),
      getCandidateApplication: jest.fn(),
      withdrawApplication: jest.fn(),
      getJobApplications: jest.fn(),
      getRecruiterApplication: jest.fn(),
      updateApplicationStatus: jest.fn(),
      addApplicationNote: jest.fn(),
      getApplicationNotes: jest.fn(),
      getApplicationEvents: jest.fn(),
    } as unknown as jest.Mocked<JobApplicationService>;
    controller = new JobApplicationController(service);
  });

  afterEach(() => jest.clearAllMocks());

  it('create returns message and data', async () => {
    service.createJobApplication.mockResolvedValue(app);
    const result = await controller.createJobApplication(
      { user: { sub: 'u1' } } as any,
      { jobId: 'j1' } as any,
    );
    expect(result.message).toBe('Job application created successfully.');
    expect(result.data.id).toBe('a1');
  });

  it('getCandidateApplications returns paginated', async () => {
    const paginated: PaginatedJobApplicationsData = {
      data: [],
      totalData: 0,
      page: 1,
      limit: 10,
      totalPage: 0,
    };
    service.getCandidateApplications.mockResolvedValue(paginated);
    const result = await controller.getCandidateApplications({ user: { sub: 'u1' } } as any);
    expect(result.data.page).toBe(1);
  });

  it('covers remaining controller routes', async () => {
    // get candidate single
    service.getCandidateApplication.mockResolvedValue(app as any);
    const one = await controller.getCandidateApplication({ user: { sub: 'u1' } } as any, 'a1');
    expect(one.data.id).toBe('a1');

    // withdraw
    service.withdrawApplication.mockResolvedValue({ ...app, status: ApplicationStatus.WITHDRAWN });
    const w = await controller.withdrawApplication({ user: { sub: 'u1' } } as any, 'a1');
    expect(w.data.status).toBe(ApplicationStatus.WITHDRAWN);

    // recruiter get one
    service.getRecruiterApplication.mockResolvedValue(app as any);
    const ro = await controller.getRecruiterApplication(
      { user: { companyRecruiterId: 'r1' } } as any,
      'a1',
    );
    expect(ro.data.id).toBe('a1');

    // update status
    service.updateApplicationStatus.mockResolvedValue({} as any);
    await controller.updateApplicationStatus({ user: { companyRecruiterId: 'r1' } } as any, 'a1', {
      status: ApplicationStatus.INTERVIEW,
    } as any);

    // add note
    service.addApplicationNote.mockResolvedValue({} as any);
    await controller.addApplicationNote({ user: { companyRecruiterId: 'r1' } } as any, 'a1', {
      note: 'Nice',
    } as any);

    // get notes
    service.getApplicationNotes.mockResolvedValue([]);
    await controller.getApplicationNotes({ user: { companyRecruiterId: 'r1' } } as any, 'a1');

    // get events
    service.getApplicationEvents.mockResolvedValue([]);
    await controller.getApplicationEvents({ user: { companyRecruiterId: 'r1' } } as any, 'a1');
  });

  it('recruiter listing parses pagination', async () => {
    const paginated: PaginatedJobApplicationsData = {
      data: [],
      totalData: 0,
      page: 3,
      limit: 15,
      totalPage: 0,
    };
    service.getJobApplications.mockResolvedValue(paginated);
    const result = await controller.getJobApplications(
      { user: { companyRecruiterId: 'r1' } } as any,
      'job-1',
      '3',
      '15',
    );
    expect(service.getJobApplications).toHaveBeenCalledWith('r1', 'job-1', 3, 15);
    expect(result.data.page).toBe(3);
  });
});
