import { Request, Response, NextFunction } from 'express';
import { ValidationError as ClassValidatorError } from 'class-validator';

// Middleware Types
export type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

// Logging Types
export interface RequestLogMetadata {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  startTime: number;
}

export interface ResponseLogMetadata extends RequestLogMetadata {
  statusCode: number;
  duration: number;
  error?: Error;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skip?: (req: Request) => boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

// Health Check Types
export interface SystemMetrics {
  cpu: {
    usage: number;
    count: number;
    model: string;
    loadAverage?: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    active: number;
    available: number;
    buffers: number;
    cached: number;
    swapTotal: number;
    swapUsed: number;
    swapFree: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usedPercent: number;
  }[];
  network: {
    interface: string;
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    errors: number;
    dropped: number;
  }[];
}

export interface ProcessMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  resourceUsage: NodeJS.ResourceUsage;
  eventLoopDelay?: number;
  activeHandles?: number;
  activeRequests?: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  lastCheck: Date;
  metadata?: Record<string, unknown>;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  system: SystemMetrics;
  process: ProcessMetrics;
  services: ServiceStatus[];
}

// Validation Types
export interface ValidationConfig {
  whitelist: boolean;
  forbidNonWhitelisted: boolean;
  validationError: {
    target: boolean;
    value: boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ClassValidatorError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  metadata?: Record<string, unknown>;
}
