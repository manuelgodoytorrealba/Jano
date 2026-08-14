export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isBeta: boolean;
  createdAt: string;
  emailVerifiedAt: string | null;
}

export interface SessionUser extends AuthUser {
  userId?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}
export interface AuthResponse {
  user: AuthUser;
}
