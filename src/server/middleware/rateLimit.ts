import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RedisClientType } from 'redis';
import { ApiError } from '../types/errors';
import { RateLimitConfig } from '../types/middleware';
import { LoggingManager } from '../managers/utils/LoggingManager';
import { monitoringService } from '../services/monitoring';
import { cache } from '../cache';

export type RateLimitBackend = 'memory' | 'redis';

export interface RateLimitOptions extends RateLimitConfig {
  backend?: RateLimitBackend;
}

class RateLimitManager {
  private readonly redisClient: RedisClientType;
  private readonly prefix = 'ratelimit:';
  private readonly logger = LoggingManager.getInstance();

  constructor() {
    this.redisClient = cache.getClient();
  }

  private getKey(identifier: string): string {
    return `${this.prefix}${identifier}`;
  }

  private handleError(req: Request, res: Response, config: RateLimitOptions) {
    const error = ApiError.tooManyRequests(
      config.message || 'Too many requests, please try again later'
    );
    
    this.logger.warn('Rate limit exceeded:', {
      path: req.path,
      ip: req.ip,
      userId: req.user?.id,
      requestId: req.requestId,
      limit: config.max,
      windowMs: config.windowMs,
      headers: {
        'retry-after': res.get('retry-after'),
        'ratelimit-limit': res.get('ratelimit-limit'),
        'ratelimit-remaining': res.get('ratelimit-remaining'),
        'ratelimit-reset': res.get('ratelimit-reset'),
      }
    });

    void monitoringService.updateServiceStatus('api', {
      name: 'api',
      status: 'degraded',
      error: 'Rate limit exceeded',
      lastCheck: new Date()
    });

    res.status(error.status).json({
      success: false,
      message: error.message,
      statusCode: error.status,
      requestId: req.requestId
    });
  }

  private createMemoryLimiter(config: RateLimitOptions) {
    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      skipSuccessfulRequests: config.skipSuccessfulRequests,
      skip: config.skip,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => this.handleError(req, res, config)
    });
  }

  private createRedisLimiter(config: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const identifier = req.session?.id || req.ip;
        const key = this.getKey(identifier);

        const requests = await this.redisClient.incr(key);
        
        if (requests === 1) {
          await this.redisClient.expire(key, config.windowMs / 1000);
        }

        if (requests > config.max) {
          this.handleError(req, res, config);
          return;
        }

        next();
      } catch (error) {
        this.logger.error('Redis rate limiter error:', {
          error: error instanceof Error ? error.message : String(error)
        });
        next(new ApiError('Internal server error', 500));
      }
    };
  }

  public createLimiter(config: RateLimitOptions) {
    return config.backend === 'redis' 
      ? this.createRedisLimiter(config)
      : this.createMemoryLimiter(config);
  }
}

export const rateLimitManager = new RateLimitManager();

// Export a convenience function for creating limiters
export const createRateLimiter = (config: RateLimitOptions) => 
  rateLimitManager.createLimiter(config);

// General API rate limit
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  skipSuccessfulRequests: false
});

// Sensitive operations rate limit (e.g. login attempts)
export const sensitiveOpLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many sensitive operations attempted, please try again later',
  skipSuccessfulRequests: true,
  backend: 'redis'
});

