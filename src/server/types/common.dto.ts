import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  requestId?: string;
  details?: ErrorDetail[];
}

export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  statusCode: number;
  requestId: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
  code: string;
  metadata?: Record<string, unknown>;
}

export class PaginationParams {
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  filter?: string;
}

export interface PaginatedResponse<T> extends ApiResponse {
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface FileUploadResponse extends ApiResponse {
  data: {
    filename: string;
    path: string;
    size: number;
    mimetype: string;
    hash?: string;
  };
}

export interface BatchOperationResponse extends ApiResponse {
  data: {
    successful: number;
    failed: number;
    errors?: ErrorDetail[];
    warnings?: string[];
  };
}

export interface HealthCheckDTO {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  memory: {
    used: number;
    free: number;
    total: number;
  };
  cpu: {
    usage: number;
    count: number;
  };
  services: {
    name: string;
    status: string;
    latency?: number;
  }[];
}

// Type for class constructor
export interface Constructor<T = any> {
  new (...args: any[]): T;
}
