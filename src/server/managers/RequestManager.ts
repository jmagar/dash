// Node.js built-in modules
import { randomUUID } from 'crypto';

// External libraries
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Local imports
import { BaseService } from '../services/base.service';
import { MetricsManager } from './MetricsManager';
import { LoggingManager } from './LoggingManager';
import { ConfigManager } from './ConfigManager';
import { SecurityManager } from './security/SecurityManager';
import { ApiError } from '../types/error';

// Rate Limit Configuration Schema
const RateLimitSchema = z.object({
  maxRequests: z.number().int().min(1).max(1000).default(100),
  windowMs: z.number().int().min(1000).max(60000).default(15000)
});

export class RequestManager extends BaseService {
  private static instance: RequestManager;
  private metricsManager: MetricsManager;
  private loggingManager: LoggingManager;
  private configManager: ConfigManager;
  private securityManager: SecurityManager;
  private rateLimits: Map<string, { count: number; resetTime: number }>;

  private constructor(
    metricsManager: MetricsManager,
    loggingManager: LoggingManager,
    configManager: ConfigManager,
    securityManager: SecurityManager
  ) {
    super({
      name: 'RequestManager',
      version: '1.0.0',
      dependencies: [
        'MetricsManager', 
        'LoggingManager', 
        'ConfigManager', 
        'SecurityManager'
      ]
    });

    this.metricsManager = metricsManager;
    this.loggingManager = loggingManager;
    this.configManager = configManager;
    this.securityManager = securityManager;
    this.rateLimits = new Map();

    this.initializeMetrics();
  }

  public static getInstance(
    metricsManager: MetricsManager,
    loggingManager: LoggingManager,
    configManager: ConfigManager,
    securityManager: SecurityManager
  ): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager(
        metricsManager,
        loggingManager,
        configManager,
        securityManager
      );
    }
    return RequestManager.instance;
  }

  private initializeMetrics(): void {
    this.metricsManager.createCounter('http_requests_total', 'Total HTTP requests', ['method', 'path', 'status']);
    this.metricsManager.createHistogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'path']);
    this.metricsManager.createCounter('http_request_errors_total', 'Total HTTP request errors', ['method', 'path', 'status']);
    this.metricsManager.createCounter('rate_limit_exceeded_total', 'Total rate limit exceeded events', ['ip']);
  }

  async init(): Promise<void> {
    try {
      // Load rate limit configuration
      const rateLimitConfig = this.configManager.get('security.rateLimiting', RateLimitSchema.parse({}));
      this.loggingManager.info('RequestManager initialized', { rateLimitConfig });
    } catch (error) {
      this.loggingManager.error('Failed to initialize RequestManager', { error });
      throw error;
    }
  }

  public async getHealth(): Promise<{ 
    status: 'healthy' | 'unhealthy' | 'degraded'; 
    details?: Record<string, unknown>; 
  }> {
    try {
      const rateLimitConfig = this.configManager.get('security.rateLimiting');
      return {
        status: 'healthy',
        details: {
          maxRequests: rateLimitConfig.maxRequests,
          windowMs: rateLimitConfig.windowMs,
          activeLimitedIPs: this.rateLimits.size
        }
      };
    } catch (error) {
      this.loggingManager.error('RequestManager health check failed', { error });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  public async cleanup(): Promise<void> {
    try {
      this.rateLimits.clear();
      this.loggingManager.info('RequestManager cleaned up successfully');
    } catch (error) {
      this.loggingManager.error('Error during RequestManager cleanup', { error });
      throw error;
    }
  }

  public validateRequest<T>(schema: z.ZodSchema<T>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = await schema.parseAsync(req.body);
        (req as Request & { validatedData: T }).validatedData = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }));

          this.metricsManager.incrementCounter('http_request_errors_total', {
            method: req.method,
            path: req.path,
            status: '400'
          });

          next(new ApiError('Validation failed', 400, validationErrors));
        } else {
          next(error);
        }
      }
    };
  }

  public rateLimit(limit?: number, windowMs?: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const rateLimitConfig = this.configManager.get('security.rateLimiting', {
        maxRequests: limit || 100,
        windowMs: windowMs || 15000
      });

      const key = this.securityManager.hashIdentifier(req.ip);
      const now = Date.now();
      const windowStart = now - rateLimitConfig.windowMs;

      const userLimit = this.rateLimits.get(key);
      if (!userLimit || userLimit.resetTime < now) {
        this.rateLimits.set(key, { count: 1, resetTime: now + rateLimitConfig.windowMs });
      } else if (userLimit.count >= rateLimitConfig.maxRequests) {
        this.metricsManager.incrementCounter('rate_limit_exceeded_total', { ip: key });
        
        throw new ApiError('Too many requests', 429, {
          limit: rateLimitConfig.maxRequests,
          windowMs: rateLimitConfig.windowMs
        });
      } else {
        userLimit.count++;
      }
      next();
    };
  }

  public traceRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = randomUUID();
      const startTime = process.hrtime();

      (req as Request & { requestId: string }).requestId = requestId;
      (res as Response & { locals: { startTime: [number, number] } }).locals.startTime = startTime;
      res.setHeader('X-Request-ID', requestId);

      res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds + nanoseconds / 1e9;

        this.metricsManager.incrementCounter('http_requests_total', {
          method: req.method,
          path: req.path,
          status: res.statusCode.toString()
        });

        this.metricsManager.observeHistogram('http_request_duration_seconds', duration, {
          method: req.method,
          path: req.path
        });

        if (res.statusCode >= 400) {
          this.metricsManager.incrementCounter('http_request_errors_total', {
            method: req.method,
            path: req.path,
            status: res.statusCode.toString()
          });
        }

        this.loggingManager.info('Request processed', {
          requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration.toFixed(3)}s`
        });
      });

      next();
    };
  }

  public handleError() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const apiError = error instanceof ApiError
        ? error
        : new ApiError(error.message, 500);

      this.loggingManager.error('Request error', {
        requestId: (req as Request & { requestId?: string }).requestId,
        method: req.method,
        path: req.path,
        error: apiError
      });

      this.metricsManager.incrementCounter('http_request_errors_total', {
        method: req.method,
        path: req.path,
        status: apiError.statusCode.toString()
      });

      res.status(apiError.statusCode).json({
        success: false,
        error: {
          message: apiError.message,
          code: apiError.code,
          context: apiError.context
        }
      });
    };
  }

  public formatResponse() {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalJson = res.json;
      res.json = function(body: unknown) {
        if (body && typeof body === 'object' && !('success' in body)) {
          body = {
            success: true,
            data: body
          };
        }
        return originalJson.call(this, body);
      };
      next();
    };
  }
}

export default RequestManager.getInstance();
