import type { LoginRequest, LoginResponse, LogoutResponse, ValidateResponse, AuthenticatedUser } from '../../types/auth';
import type { User } from '../../types/models-shared';
import { createApiError } from '../../types/error';
import { api } from './api';
import { logger } from '../utils/logger';

const isAuthDisabled = process.env.REACT_APP_DISABLE_AUTH === 'true';

// Default dev user when auth is disabled
const devUser: User = {
  id: 'dev-user',
  username: 'dev',
  email: 'dev@localhost',
  role: 'admin',
  is_active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Configure axios
const axiosApi = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
axiosApi.interceptors.response.use(
  response => response,
  error => {
    logger.error('Auth API request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export async function login(request: LoginRequest): Promise<LoginResponse> {
  if (isAuthDisabled) {
    const user: AuthenticatedUser = {
      id: devUser.id,
      username: devUser.username,
      role: devUser.role,
    };
    return {
      success: true,
      token: 'dev-token',
      user,
    };
  }

  try {
    logger.info('Attempting login', { username: request.username });
    const response = await api.post<LoginResponse>('/auth/login', request);
    logger.info('Login successful', { username: request.username });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw createApiError('Login failed', error);
    }
    throw createApiError('Login failed', new Error('Unknown error'));
  }
}

export async function validate(): Promise<ValidateResponse> {
  if (isAuthDisabled) {
    const user: AuthenticatedUser = {
      id: devUser.id,
      username: devUser.username,
      role: devUser.role,
    };
    return {
      success: true,
      user,
    };
  }

  try {
    logger.info('Validating token');
    const response = await api.get<ValidateResponse>('/auth/validate');
    logger.info('Token validation successful');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw createApiError('Token validation failed', error);
    }
    throw createApiError('Token validation failed', new Error('Unknown error'));
  }
}

export async function logout(): Promise<LogoutResponse> {
  if (isAuthDisabled) {
    logger.info('Auth disabled, skipping logout');
    return { success: true };
  }

  try {
    logger.info('Attempting logout');
    const response = await api.post<LogoutResponse>('/auth/logout');
    logger.info('Logout successful');
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw createApiError('Logout failed', error);
    }
    throw createApiError('Logout failed', new Error('Unknown error'));
  }
}

export async function register(data: Partial<User>): Promise<LoginResponse> {
  if (isAuthDisabled) {
    const user: AuthenticatedUser = {
      id: devUser.id,
      username: devUser.username,
      role: devUser.role,
    };
    return {
      success: true,
      token: 'dev-token',
      user,
    };
  }

  try {
    logger.info('Attempting registration', { username: data.username });
    const response = await axiosApi.post('/auth/register', data);
    logger.info('Registration successful', { username: data.username });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw createApiError('Registration failed', error);
    }
    throw createApiError('Registration failed', new Error('Unknown error'));
  }
}

export async function updateUser(data: Partial<User>): Promise<LoginResponse> {
  if (isAuthDisabled) {
    const user: AuthenticatedUser = {
      id: devUser.id,
      username: devUser.username,
      role: devUser.role,
    };
    return {
      success: true,
      token: 'dev-token',
      user,
    };
  }

  try {
    logger.info('Updating user', { userId: data.id });
    const response = await axiosApi.put(`/auth/users/${data.id}`, data);
    logger.info('User update successful', { userId: data.id });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw createApiError('User update failed', error);
    }
    throw createApiError('User update failed', new Error('Unknown error'));
  }
}

export async function validateToken(): Promise<ApiResult<User>> {
  if (isAuthDisabled) {
    logger.info('Auth disabled, using default response');
    return {
      success: true,
      data: devUser,
    };
  }

  try {
    logger.info('Validating token');
    const response = await axiosApi.get('/auth/validate');
    logger.info('Token validation successful');
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
    return { success: false, error: errorMessage };
  }
}

export async function refreshToken(): Promise<ApiResult<{ token: string }>> {
  if (isAuthDisabled) {
    logger.info('Auth disabled, using default response');
    return {
      success: true,
      data: { token: 'dev-token' },
    };
  }

  try {
    logger.info('Refreshing token');
    const response = await axiosApi.post('/auth/refresh');
    logger.info('Token refresh successful');
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
    return { success: false, error: errorMessage };
  }
}
