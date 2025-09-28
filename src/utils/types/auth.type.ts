import type { RecuiterLevel } from '../enums/recuiter-level.enum';

/**
 * Minimal projection of a user returned to clients.
 */
export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
};

/**
 * Structure returned by login/register endpoints.
 */
export type AuthTokenPayload = {
  accessToken: string;
  user: AuthenticatedUser;
  role: 'candidate' | 'recruiter';
  recruiter?: {
    companyId: string;
    recuiterLevel: RecuiterLevel;
  };
};

/**
 * Decoded JWT payload injected by the auth guard.
 */
export type JwtPayload = {
  sub: string;
  email: string;
  role: 'candidate' | 'recruiter';
  recruiter?: {
    companyId: string;
    recuiterLevel: RecuiterLevel;
  };
  companyRecruiterId?: string;
};

/**
 * Structure returned by the `/auth/me` profile endpoint.
 */
export type AuthProfilePayload = {
  user: AuthenticatedUser;
  role: 'candidate' | 'recruiter';
  recruiter?: {
    companyId: string;
    recuiterLevel: RecuiterLevel;
  };
};
