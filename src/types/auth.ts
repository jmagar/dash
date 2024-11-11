import { ParamsDictionary } from 'express-serve-static-core';

import { AuthenticatedUser } from './jwt';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  last_login?: Date;
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

export type RequestParams = ParamsDictionary
