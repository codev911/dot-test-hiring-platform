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
