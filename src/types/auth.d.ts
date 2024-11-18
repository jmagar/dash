export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  password_hash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedUser extends User {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export interface TokenPayload {
  id: string;
  userId: string;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
  user: AuthenticatedUser | null;
}

export interface ValidateResponse {
  success: boolean;
  error?: string;
  user: AuthenticatedUser | null;
  valid: boolean;
}

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  error?: string;
  token: string;
  refreshToken: string;
}

export interface SessionData {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  refreshToken: string;
  expiresAt: string;
}
