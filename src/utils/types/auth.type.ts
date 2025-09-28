import type { RecuiterLevel } from '../enums/recuiter-level.enum';

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
};

export type AuthTokenPayload = {
  accessToken: string;
  user: AuthenticatedUser;
  role: 'candidate' | 'recruiter';
  recruiter?: {
    companyId: string;
    recuiterLevel: RecuiterLevel;
  };
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: 'candidate' | 'recruiter';
  recruiter?: {
    companyId: string;
    recuiterLevel: RecuiterLevel;
  };
};

export type AuthProfilePayload = {
  user: AuthenticatedUser;
  role: 'candidate' | 'recruiter';
  recruiter?: {
    companyId: string;
    recuiterLevel: RecuiterLevel;
  };
};
