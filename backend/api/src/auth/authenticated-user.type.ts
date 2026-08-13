import type { Request } from 'express';

export type AuthenticatedUser = {
  userId: string;
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  role: string;
  isBeta: boolean;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

export type OptionalAuthenticatedRequest = Request & {
  user: AuthenticatedUser | null;
};
