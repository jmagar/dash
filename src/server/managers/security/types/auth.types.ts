import type { JwtPayload } from 'jsonwebtoken';

export interface TokenPayload extends JwtPayload {
  userId: string;
  role?: string;
  permissions?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface PasswordResetRequest {
  email: string;
  newPassword: string;
  token: string;
}

export interface AuthMetrics {
  authAttempts: number;
  activeTokens: number;
  failedLogins: number;
  blockedAttempts: number;
  passwordResetAttempts: number;
}
