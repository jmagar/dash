import type { ParamsDictionary } from 'express-serve-static-core';

import type { User as BaseUser } from './models-shared';

export type { BaseUser as User };

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthenticatedUser;
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export interface ValidateResponse {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export interface BaseTokenPayload {
  [key: string]: unknown;
  id: string;
  username: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPayload extends BaseTokenPayload {
  type: 'access' | 'refresh';
}

export interface RefreshTokenPayload extends BaseTokenPayload {
  type: 'refresh';
}

export interface AccessTokenPayload extends BaseTokenPayload {
  type: 'access';
}

export type RequestParams = ParamsDictionary;
