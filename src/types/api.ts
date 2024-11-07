import { AxiosError } from 'axios';
import { ApiResult } from './index';

export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VALIDATE: '/auth/validate',
    UPDATE: (userId: number) => `/auth/users/${userId}`,
    VERIFY_MFA: '/auth/mfa/verify',
    SETUP_MFA: '/auth/mfa/setup',
    DISABLE_MFA: '/auth/mfa/disable',
  },
  FILES: {
    LIST: (hostId: number) => `/hosts/${hostId}/files`,
    DOWNLOAD: (hostId: number) => `/hosts/${hostId}/files/download`,
    UPLOAD: (hostId: number) => `/hosts/${hostId}/files/upload`,
    DELETE: (hostId: number) => `/hosts/${hostId}/files/delete`,
  },
  HOSTS: {
    LIST: '/hosts',
    CREATE: '/hosts',
    UPDATE: (hostId: number) => `/hosts/${hostId}`,
    DELETE: (hostId: number) => `/hosts/${hostId}`,
    STATS: (hostId: number) => `/hosts/${hostId}/stats`,
  },
  PACKAGES: {
    LIST: (hostId: number) => `/hosts/${hostId}/packages`,
    INSTALL: (hostId: number) => `/hosts/${hostId}/packages/install`,
    UNINSTALL: (hostId: number) => `/hosts/${hostId}/packages/uninstall`,
    UPDATE: (hostId: number) => `/hosts/${hostId}/packages/update`,
  },
  DOCKER: {
    CONTAINERS: '/docker/containers',
    CONTAINER: (id: string) => `/docker/containers/${id}`,
    CONTAINER_LOGS: (id: string) => `/docker/containers/${id}/logs`,
    CONTAINER_STATS: (id: string) => `/docker/containers/${id}/stats`,
    CONTAINER_EXEC: (id: string) => `/docker/containers/${id}/exec`,
    STACKS: '/docker/stacks',
    STACK: (name: string) => `/docker/stacks/${name}`,
  },
};

export const handleApiError = <T>(error: unknown): ApiResult<T> => {
  if (error instanceof AxiosError) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : 'An unknown error occurred',
  };
};
