import axios from 'axios';

import type { User, ApiResult, AuthResult, UserRegistration } from '../../types';
import { API_ENDPOINTS } from '../../types/api-shared';
import { handleApiError } from '../../types/error';
import { BASE_URL } from '../config';
import { logger } from '../utils/frontendLogger';

const isAuthDisabled = process.env.REACT_APP_DISABLE_AUTH === 'true';

// Default dev user when auth is disabled
const devUser: User = {
  id: 1,
  username: 'dev',
  role: 'admin',
  is_active: true,
  email: 'dev@example.com',
  lastLogin: new Date(),
  createdAt: new Date(),
};

// Default response when auth is disabled
const authDisabledResponse: ApiResult<AuthResult> = {
  success: true,
  data: {
    success: true,
    data: devUser,
    token: 'dev-token',
  },
};

// Configure axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
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

export async function login(
  username: string,
  password: string,
): Promise<ApiResult<AuthResult>> {
  if (isAuthDisabled) {
    logger.info('Auth disabled, using default response');
    return authDisabledResponse;
  }

  try {
    logger.info('Attempting login', { username });
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password,
    });
    logger.info('Login successful', { username });
    return response.data;
  } catch (error) {
    return handleApiError<AuthResult>(error, 'login');
  }
}

export async function logout(): Promise<ApiResult<void>> {
  if (isAuthDisabled) {
    logger.info('Auth disabled, skipping logout');
    return { success: true };
  }

  try {
    logger.info('Attempting logout');
    const response = await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    logger.info('Logout successful');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'logout');
  }
}

export async function register(data: UserRegistration): Promise<ApiResult<AuthResult>> {
  if (isAuthDisabled) {
    logger.info('Auth disabled, using default response');
    return authDisabledResponse;
  }

  try {
    logger.info('Attempting registration', { username: data.username });
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, data);
    logger.info('Registration successful', { username: data.username });
    return response.data;
  } catch (error) {
    return handleApiError<AuthResult>(error, 'register');
  }
}

export async function updateUser(data: Partial<User>): Promise<ApiResult<User>> {
  if (isAuthDisabled) {
    logger.info('Auth disabled, using default response');
    return {
      success: true,
      data: {
        ...devUser,
        ...data,
      },
    };
  }

  try {
    logger.info('Updating user', { userId: data.id?.toString() });
    const response = await api.put(
      API_ENDPOINTS.AUTH.UPDATE(data.id as number),
      data,
    );
    logger.info('User update successful', { userId: data.id?.toString() });
    return response.data;
  } catch (error) {
    return handleApiError<User>(error, 'updateUser');
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
    const response = await api.get(API_ENDPOINTS.AUTH.VALIDATE);
    logger.info('Token validation successful');
    return response.data;
  } catch (error) {
    return handleApiError<User>(error, 'validateToken');
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
    const response = await api.post(API_ENDPOINTS.AUTH.REFRESH);
    logger.info('Token refresh successful');
    return response.data;
  } catch (error) {
    return handleApiError<{ token: string }>(error, 'refreshToken');
  }
}
