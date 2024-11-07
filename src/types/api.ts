import axios, { AxiosError } from 'axios';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type ApiResult<T> = Promise<ApiResponse<T>>;

export const handleApiError = <T>(error: unknown): ApiResponse<T> => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      success: false,
      error: axiosError.response?.data?.message || axiosError.message,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: false,
    error: 'An unknown error occurred',
  };
};

export const BASE_URL = process.env.REACT_APP_API_URL || '';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
  },
  HOSTS: {
    LIST: '/hosts',
    STATUS: '/hosts/status',
    STATS: (id: number) => `/hosts/${id}/stats`,
    CONNECT: (id: number) => `/hosts/${id}/connect`,
    DISCONNECT: (id: number) => `/hosts/${id}/disconnect`,
  },
  FILES: {
    LIST: (hostId: number) => `/files/${hostId}/list`,
    DOWNLOAD: (hostId: number) => `/files/${hostId}/download`,
    UPLOAD: (hostId: number) => `/files/${hostId}/upload`,
    DELETE: (hostId: number) => `/files/${hostId}/delete`,
  },
  PACKAGES: {
    LIST: (hostId: number) => `/packages/${hostId}/list`,
    INSTALL: (hostId: number) => `/packages/${hostId}/install`,
    UNINSTALL: (hostId: number) => `/packages/${hostId}/uninstall`,
    UPDATE: (hostId: number) => `/packages/${hostId}/update`,
  },
  EXECUTE: {
    COMMAND: (hostId: number) => `/execute/${hostId}/command`,
    SCRIPT: (hostId: number) => `/execute/${hostId}/script`,
    HISTORY: (hostId: number) => `/execute/${hostId}/history`,
  },
  TERMINAL: {
    CREATE: (hostId: number) => `/terminal/${hostId}/create`,
    RESIZE: (hostId: number, sessionId: string) => `/terminal/${hostId}/${sessionId}/resize`,
    CLOSE: (hostId: number, sessionId: string) => `/terminal/${hostId}/${sessionId}/close`,
  },
  USER: {
    PROFILE: '/user/profile',
    PREFERENCES: '/user/preferences',
    PASSWORD: '/user/password',
  },
};
