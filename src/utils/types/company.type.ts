import type { RecuiterLevel } from '../enums/recuiter-level.enum';

/**
 * Public company projection returned by REST endpoints.
 */
export type CompanyData = {
  id: string;
  name: string;
  website?: string;
  logoPath?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Result returned after creating a recruiter for the company.
 */
export type RecruiterCreationData = {
  userId: string;
  companyRecruiterId: string;
  email: string;
  recuiterLevel: RecuiterLevel;
  companyId: string;
};
