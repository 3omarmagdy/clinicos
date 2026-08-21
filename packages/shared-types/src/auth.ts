/**
 * Authentication Types
 */

export interface LoginCredentials {
  email: string;
  password: string;
  organizationSlug: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  organizationId: string;
  role: string;
  permissions: string[];
  isPlatformAdmin: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: string;
  permissions: string[];
  email: string;
  isPlatformAdmin: boolean;
}
