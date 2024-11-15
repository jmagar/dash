import type { ParamsDictionary } from 'express-serve-static-core';

import type { User as BaseUser } from './models-shared';

export type { BaseUser as User };

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  email: string;
  lastLogin?: Date;
  createdAt: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export interface ValidateResponse {
  valid: boolean;
  user: AuthenticatedUser;
}

export interface TokenPayload {
  id: string;
  username: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

export interface AuthState {
  token: string | null;
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
}

export interface AuthContextType {
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  validateToken: () => Promise<void>;
}

export type RequestParams = ParamsDictionary;
