import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MetricsManager } from '../metrics/MetricsManager';
import { logger } from '../logger';
import { ApiError } from '../../types/error';
import { ConfigManager } from '../config/ConfigManager';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

export class RequestManager {
  private static instance: RequestManager;
  private metricsManager: MetricsManager;
  private configManager: ConfigManager;
  private rateLimits: Map<string, { count: number; resetTime: number }>;

  private constructor() {
    this.metricsManager = MetricsManager.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.rateLimits = new Map();

    // Initialize request metrics
    this.metricsManager.createCounter('http_requests_total', 'Total HTTP requests');
    this.metricsManager.createHistogram('http_request_duration_seconds', 'HTTP request duration');
    this.metricsManager.createCounter('http_request_errors_total', 'Total HTTP request errors');
  }

  public static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  public validateRequest<T>(schema: z.ZodSchema<T>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = await schema.parseAsync(req.body);
        req.validatedData = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ApiError('Validation failed', 400, error.errors));
        } else {
          next(error);
        }
      }
    };
  }

  public rateLimit(limit: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      const userLimit = this.rateLimits.get(key);
      if (!userLimit || userLimit.resetTime < now) {
        this.rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      } else if (userLimit.count >= limit) {
        throw new ApiError('Too many requests', 429);
      } else {
        userLimit.count++;
      }
      next();
    };
  }

  public traceRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = crypto.randomUUID();
      const startTime = process.hrtime();

      req.requestId = requestId;
      res.locals.startTime = startTime;

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

        loggerLoggingManager.getInstance().()}s`
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

      loggerLoggingManager.getInstance().();

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
      res.json = function(body: any) {
        if (body && !body.hasOwnProperty('success')) {
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

