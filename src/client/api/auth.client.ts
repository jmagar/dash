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

export async function login(
  username: string,
  password: string,
): Promise<ApiResult<AuthResult>> {
  if (isAuthDisabled) {
    logger.info('Auth disabled, using default response');
    return authDisabledResponse;
  }

  try {
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
      username,
      password,
    });
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
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`);
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
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, data);
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
    const response = await axios.put(
      `${BASE_URL}${API_ENDPOINTS.AUTH.UPDATE(data.id as number)}`,
      data,
    );
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
    const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.AUTH.VALIDATE}`);
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
    const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`);
    return response.data;
  } catch (error) {
    return handleApiError<{ token: string }>(error, 'refreshToken');
  }
}
