import { ParamsDictionary } from 'express-serve-static-core';

import type { User } from './models-shared';

export type { User };

export interface AuthenticatedUser {
  id: string | number;
  username: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export type SessionData = AuthenticatedUser;

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: SessionData;
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export interface ValidateResponse {
  success: boolean;
  user?: SessionData;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: SessionData;
  error?: string;
}

export type RequestParams = ParamsDictionary;
