/**
 * Common type definitions for API requests and responses
 */

export interface ApiRequest<T = unknown> {
  data: T;
  params?: Record<string, string | number | boolean>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedRequest extends Record<string, unknown> {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type ApiErrorResponse = ApiResponse<never> & {
  success: false;
  error: string;
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  validationErrors: ValidationError[];
}
