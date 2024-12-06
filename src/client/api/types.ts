// Common API response type
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Common endpoint type for API clients
export interface Endpoints {
  [key: string]: string | ((...args: any[]) => string);
}

// Common error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Common pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> extends ApiResult<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
