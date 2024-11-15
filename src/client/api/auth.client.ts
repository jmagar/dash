import { api } from './api';
import type { LoginRequest, LoginResponse, ValidateResponse, AuthenticatedUser } from '../../types/auth';
import { createApiError } from '../../types/error';
import { logger } from '../utils/logger';

const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  VALIDATE: '/auth/validate',
  UPDATE: '/auth/update',
} as const;

export async function login(request: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await api.post<LoginResponse>(AUTH_ENDPOINTS.LOGIN, request);
    return response.data;
  } catch (error) {
    logger.error('Failed to login:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to login', error, 401);
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post(AUTH_ENDPOINTS.LOGOUT);
  } catch (error) {
    logger.error('Failed to logout:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to logout', error, 500);
  }
}

export async function validate(): Promise<ValidateResponse> {
  try {
    const response = await api.get<ValidateResponse>(AUTH_ENDPOINTS.VALIDATE);
    return response.data;
  } catch (error) {
    logger.error('Failed to validate token:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to validate token', error, 401);
  }
}

export async function updateUser(user: Partial<AuthenticatedUser>): Promise<AuthenticatedUser> {
  try {
    const response = await api.post<{ data: AuthenticatedUser }>(AUTH_ENDPOINTS.UPDATE, user);
    return response.data.data;
  } catch (error) {
    logger.error('Failed to update user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw createApiError('Failed to update user', error, 500);
  }
}
