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
    UPDATE: (userId: number): string => `/auth/users/${userId}`,
    VERIFY_MFA: '/auth/mfa/verify',
    SETUP_MFA: '/auth/mfa/setup',
    DISABLE_MFA: '/auth/mfa/disable',
  },
  FILES: {
    LIST: (hostId: number): string => `/hosts/${hostId}/files`,
    DOWNLOAD: (hostId: number): string => `/hosts/${hostId}/files/download`,
    UPLOAD: (hostId: number): string => `/hosts/${hostId}/files/upload`,
    DELETE: (hostId: number): string => `/hosts/${hostId}/files/delete`,
  },
  HOSTS: {
    LIST: '/hosts',
    CREATE: '/hosts',
    UPDATE: (hostId: number): string => `/hosts/${hostId}`,
    DELETE: (hostId: number): string => `/hosts/${hostId}`,
    STATS: (hostId: number): string => `/hosts/${hostId}/stats`,
    STATUS: '/hosts/status',
    CONNECT: (hostId: number): string => `/hosts/${hostId}/connect`,
    DISCONNECT: (hostId: number): string => `/hosts/${hostId}/disconnect`,
  },
  PACKAGES: {
    LIST: (hostId: number): string => `/hosts/${hostId}/packages`,
    INSTALL: (hostId: number): string => `/hosts/${hostId}/packages/install`,
    UNINSTALL: (hostId: number): string => `/hosts/${hostId}/packages/uninstall`,
    UPDATE: (hostId: number): string => `/hosts/${hostId}/packages/update`,
  },
  EXECUTE: {
    COMMAND: (hostId: number): string => `/execute/${hostId}`,
    HISTORY: (hostId: number): string => `/execute/${hostId}/history`,
    SAVED: (hostId: number): string => `/execute/${hostId}/saved`,
    SAVED_COMMAND: (hostId: number, commandId: string): string =>
      `/execute/${hostId}/saved/${commandId}`,
    SCRIPT: (hostId: number): string => `/execute/${hostId}/script`,
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
