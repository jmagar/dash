import { isAxiosError } from 'axios';

import type {
  ApiResult,
} from './models';

export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export const handleApiError = <T>(error: unknown): ApiResult<T> => {
  if (isAxiosError(error)) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'An unknown error occurred',
    };
  }
  return {
    success: false,
    error: 'An unexpected error occurred',
  };
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VALIDATE: '/auth/validate',
    UPDATE: (userId: number): string => `/auth/users/${userId}`,
    VERIFY_MFA: '/auth/verify-mfa',
    SETUP_MFA: '/auth/setup-mfa',
    DISABLE_MFA: '/auth/disable-mfa',
  },
  HOSTS: {
    LIST: '/hosts',
    STATUS: '/hosts/status',
    ADD: '/hosts',
    REMOVE: (id: number): string => `/hosts/${id}`,
    TEST: '/hosts/test-connection',
    STATS: (id: number): string => `/hosts/${id}/stats`,
    LOGS: (id: number): string => `/hosts/${id}/logs`,
    TEST_CONNECTION: '/hosts/test-connection',
    CONNECT: (id: number): string => `/hosts/${id}/connect`,
    DISCONNECT: (id: number): string => `/hosts/${id}/disconnect`,
  },
  FILES: {
    LIST: (hostId: number): string => `/hosts/${hostId}/files`,
    UPLOAD: (hostId: number): string => `/hosts/${hostId}/files/upload`,
    DOWNLOAD: (hostId: number): string => `/hosts/${hostId}/files/download`,
  },
  DOCKER: {
    CONTAINERS: '/docker/containers',
    CONTAINER: (id: string): string => `/docker/containers/${id}`,
    CONTAINER_LOGS: (id: string): string => `/docker/containers/${id}/logs`,
    CONTAINER_STATS: (id: string): string => `/docker/containers/${id}/stats`,
    CONTAINER_EXEC: (id: string): string => `/docker/containers/${id}/exec`,
    STACKS: '/docker/stacks',
    STACK: (name: string): string => `/docker/stacks/${name}`,
    STACK_START: (name: string): string => `/docker/stacks/${name}/start`,
    STACK_STOP: (name: string): string => `/docker/stacks/${name}/stop`,
    STACK_LOGS: (name: string): string => `/docker/stacks/${name}/logs`,
  },
  EXECUTE: {
    COMMAND: (hostId: number): string => `/hosts/${hostId}/execute`,
    SCRIPT: (hostId: number): string => `/hosts/${hostId}/script`,
    HISTORY: (hostId: number): string => `/hosts/${hostId}/command-history`,
    SAVED: (hostId: number): string => `/hosts/${hostId}/saved-commands`,
    SAVED_COMMAND: (hostId: number, commandId: string): string =>
      `/hosts/${hostId}/saved-commands/${commandId}`,
  },
  PACKAGES: {
    LIST: (hostId: number): string => `/hosts/${hostId}/packages`,
    INSTALL: (hostId: number): string => `/hosts/${hostId}/packages/install`,
    UNINSTALL: (hostId: number): string => `/hosts/${hostId}/packages/uninstall`,
    UPDATE: (hostId: number): string => `/hosts/${hostId}/packages/update`,
    SEARCH: (hostId: number): string => `/hosts/${hostId}/packages/search`,
    INFO: (hostId: number, packageName: string): string =>
      `/hosts/${hostId}/packages/${packageName}/info`,
  },
};
