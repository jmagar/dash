import axios from 'axios';
import type { User, AuthToken } from '../types';
import type { ApiResponse, ApiResult } from '../types';
import { handleApiError } from '../types';

const BASE_URL = process.env.REACT_APP_API_URL || '';

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: AuthToken;
}

export const login = async (credentials: LoginCredentials): ApiResult<LoginResponse> => {
  try {
    const { data } = await axios.post<LoginResponse>(`${BASE_URL}/api/auth/login`, credentials);
    return {
      success: true,
      data,
    } as ApiResponse<LoginResponse>;
  } catch (error) {
    return handleApiError<LoginResponse>(error);
  }
};

export const logout = async (): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/auth/logout`);
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const refreshToken = async (token: string): ApiResult<AuthToken> => {
  try {
    const { data } = await axios.post<AuthToken>(`${BASE_URL}/api/auth/refresh`, { token });
    return {
      success: true,
      data,
    } as ApiResponse<AuthToken>;
  } catch (error) {
    return handleApiError<AuthToken>(error);
  }
};

export const updateUser = async (userId: number, updates: Partial<User>): ApiResult<User> => {
  try {
    const { data } = await axios.patch<User>(`${BASE_URL}/api/users/${userId}`, updates);
    return {
      success: true,
      data,
    } as ApiResponse<User>;
  } catch (error) {
    return handleApiError<User>(error);
  }
};

export const changePassword = async (userId: number, currentPassword: string, newPassword: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/users/${userId}/password`, {
      currentPassword,
      newPassword,
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const requestPasswordReset = async (email: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/auth/password-reset/request`, { email });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const resetPassword = async (token: string, newPassword: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/auth/password-reset/confirm`, {
      token,
      newPassword,
    });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};

export const verifyEmail = async (token: string): ApiResult<void> => {
  try {
    await axios.post(`${BASE_URL}/api/auth/verify-email`, { token });
    return {
      success: true,
      data: undefined,
    } as ApiResponse<void>;
  } catch (error) {
    return handleApiError<void>(error);
  }
};
