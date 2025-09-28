/**
 * Shape describing the avatar information returned to clients.
 */
export type UserAvatarData = {
  avatarUrl: string | null;
};

/**
 * Metadata returned after updating a user's password.
 */
export type PasswordChangeData = {
  userId: string;
};

/**
 * Shape describing resume information returned to clients.
 */
export type UserResumeData = {
  resumeUrl: string | null;
};

/**
 * Shape describing user skill information returned to clients.
 */
export type UserSkillData = {
  id: string;
  skillName: string;
  proficiency: string;
  yearsExperience?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Paginated response for user skills.
 */
export type PaginatedUserSkillsData = {
  data: UserSkillData[];
  totalData: number;
  page: number;
  limit: number;
  totalPage: number;
};

/**
 * Shape describing user education information returned to clients.
 */
export type UserEducationData = {
  id: string;
  institution: string;
  educationLevel: string;
  fromMonth?: string;
  fromYear: number;
  toMonth?: string;
  toYear: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Paginated response for user educations.
 */
export type PaginatedUserEducationsData = {
  data: UserEducationData[];
  totalData: number;
  page: number;
  limit: number;
  totalPage: number;
};

/**
 * Shape describing user experience information returned to clients.
 */
export type UserExperienceData = {
  id: string;
  title: string;
  company: string;
  type: string;
  location: string;
  fromMonth?: string;
  fromYear?: number;
  toMonth?: string;
  toYear?: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Paginated response for user experiences.
 */
export type PaginatedUserExperiencesData = {
  data: UserExperienceData[];
  totalData: number;
  page: number;
  limit: number;
  totalPage: number;
};
