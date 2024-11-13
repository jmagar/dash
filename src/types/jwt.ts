export interface JWTPayload {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  email?: string;
  lastLogin?: Date;
  createdAt?: Date;
}

export interface TokenError extends Error {
  name: 'JsonWebTokenError' | 'TokenExpiredError';
}
