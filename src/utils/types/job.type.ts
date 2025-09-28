import type { ApplicationStatus } from '../enums/application-status.enum';
import type { FiatCurrency } from '../enums/fiat-currency.enum';
import type { JobLocation } from '../enums/job-location.enum';
import type { JobType } from '../enums/job-type.enum';
import type { SkillPriority } from '../enums/skill-priority.enum';
import type { SkillProficiency } from '../enums/skill-proficiency.enum';

/**
 * Job posting data structure.
 */
export type JobPostingData = {
  id: string;
  companyId: string;
  recruiterId?: string;
  title: string;
  slug: string;
  description: string;
  employmentType: JobType;
  workLocationType: JobLocation;
  salaryMin?: string;
  salaryMax?: string;
  salaryCurrency?: FiatCurrency;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Job posting with company details for public view.
 */
export type JobPostingWithCompanyData = JobPostingData & {
  company: {
    id: string;
    name: string;
    description?: string;
  };
  benefits: JobBenefitData[];
  requirements: JobRequirementData[];
  skills: JobSkillData[];
};

/**
 * Paginated job postings data.
 */
export type PaginatedJobPostingsData = {
  data: JobPostingWithCompanyData[];
  totalData: number;
  page: number;
  limit: number;
  totalPage: number;
};

/**
 * Job benefit data structure.
 */
export type JobBenefitData = {
  id: string;
  jobId: string;
  label: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Job requirement data structure.
 */
export type JobRequirementData = {
  id: string;
  jobId: string;
  label: string;
  detail?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Job skill data structure.
 */
export type JobSkillData = {
  id: string;
  jobId: string;
  skillName: string;
  priority: SkillPriority;
  proficiency?: SkillProficiency;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Job application data structure.
 */
export type JobApplicationData = {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  expectedSalary?: string;
  salaryCurrency?: FiatCurrency;
  availableFrom?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Job application with related data.
 */
export type JobApplicationWithRelationsData = JobApplicationData & {
  job: {
    id: string;
    title: string;
    companyName: string;
  };
  candidate: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
  resume?: {
    id: string;
    resumeUrl?: string;
  };
};

/**
 * Paginated job applications data.
 */
export type PaginatedJobApplicationsData = {
  data: JobApplicationWithRelationsData[];
  totalData: number;
  page: number;
  limit: number;
  totalPage: number;
};

/**
 * Job application event data structure.
 */
export type JobApplicationEventData = {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  note?: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Job application note data structure.
 */
export type JobApplicationNoteData = {
  id: string;
  applicationId: string;
  authorRecruiterId: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName?: string;
  };
};

/**
 * Job search filters.
 */
export type JobSearchFilters = {
  query?: string;
  location?: string;
  employmentType?: JobType;
  workLocationType?: JobLocation;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: FiatCurrency;
  companyId?: string;
  skills?: string[];
};

/**
 * Job analytics data.
 */
export type JobAnalyticsData = {
  jobId: string;
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  averageTimeToHire?: number;
  topSkills: string[];
};

/**
 * Company job analytics.
 */
export type CompanyJobAnalyticsData = {
  companyId: string;
  totalJobs: number;
  publishedJobs: number;
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  averageApplicationsPerJob: number;
  topPerformingJobs: Array<{
    jobId: string;
    title: string;
    applicationCount: number;
  }>;
};
