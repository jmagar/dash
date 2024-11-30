import type { LogMetadata } from './logger';

// Base API types
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  metadata?: LogMetadata;
}

export interface ApiError {
  error?: string;
  message?: string;
  status?: number;
  metadata?: LogMetadata;
}

// Common request/response patterns
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// API method types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API route parameters
export interface RouteParams {
  id?: string;
  hostId?: string;
  userId?: string;
}

// API query parameters
export interface QueryParams extends PaginationParams {
  search?: string;
  filter?: Record<string, unknown>;
  include?: string[];
}

// Endpoint paths
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    UPDATE: (userId: string) => `/auth/users/${userId}`,
    VERIFY_MFA: '/auth/verify-mfa',
    SETUP_MFA: '/auth/setup-mfa',
    DISABLE_MFA: '/auth/disable-mfa',
  },
  HOSTS: {
    BASE: '/hosts',
    CREATE: '/hosts',
    UPDATE: (id: string) => `/hosts/${id}`,
    DELETE: (id: string) => `/hosts/${id}`,
    GET: (id: string) => `/hosts/${id}`,
    LIST: '/hosts',
    TEST: '/hosts/test',
    STATS: (id: string) => `/hosts/${id}/stats`,
    LOGS: (id: string) => `/hosts/${id}/logs`,
    TEST_CONNECTION: '/hosts/test-connection',
    CONNECT: (id: string) => `/hosts/${id}/connect`,
    DISCONNECT: (id: string) => `/hosts/${id}/disconnect`,
  },
  PROCESSES: {
    LIST: (hostId: string) => `/hosts/${hostId}/processes`,
    GET: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}`,
    METRICS: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}/metrics`,
    KILL: (hostId: string, pid: number) => `/hosts/${hostId}/processes/${pid}/kill`,
  },
} as const;
