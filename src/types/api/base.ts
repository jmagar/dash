import { z } from 'zod';
import type { LogMetadata } from '../logger';

// Base API types with Zod schemas
export const apiResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  status: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ApiResult<T> = z.infer<typeof apiResultSchema> & {
  data?: T;
  metadata?: LogMetadata;
};

export const apiErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  status: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema> & {
  metadata?: LogMetadata;
};

// Common request/response patterns
export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export const paginatedResponseSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  pages: z.number().int().min(0),
});

export type PaginatedResponse<T> = Omit<z.infer<typeof paginatedResponseSchema>, 'items'> & {
  items: T[];
};

// API method types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API endpoint configuration
export interface ApiEndpointConfig {
  method: ApiMethod;
  path: string;
  requiresAuth: boolean;
  rateLimit?: {
    points: number;
    duration: number;
  };
}

// API route parameters
export const routeParamsSchema = z.object({
  id: z.string().uuid(),
  hostId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type RouteParams = z.infer<typeof routeParamsSchema>;

// API query parameters
export const queryParamsSchema = z.object({
  search: z.string().optional(),
  filter: z.record(z.unknown()).optional(),
  include: z.array(z.string()).optional(),
}).merge(paginationSchema);

export type QueryParams = z.infer<typeof queryParamsSchema>;

// Utility type for creating API endpoints
export type ApiEndpoint<TRequest, TResponse> = {
  config: ApiEndpointConfig;
  requestSchema: z.ZodType<TRequest>;
  responseSchema: z.ZodType<TResponse>;
};
