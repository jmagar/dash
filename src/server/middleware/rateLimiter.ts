import { Request, Response, NextFunction } from 'express';
import { RedisClientType } from 'redis';
import { cache } from '../cache';
import { ApiError } from '../utils/error';
import { LoggingManager } from '../utils/logging/LoggingManager';

export class RateLimiter {
  private readonly client: RedisClientType;
  private readonly prefix = 'ratelimit:';
  private readonly windowMs = 60 * 1000; // 1 minute window
  private readonly maxRequests = 30; // Max requests per window

  constructor() {
    this.client = cache.getClient();
  }

  private getKey(identifier: string): string {
    return `${this.prefix}${identifier}`;
  }

  async middleware(req: Request, res: Response, next: NextFunction) {
    try {
      const identifier = req.session?.id || req.ip;
      const key = this.getKey(identifier);

      const requests = await this.client.incr(key);
      
      if (requests === 1) {
        await this.client.expire(key, this.windowMs / 1000);
      }

      if (requests > this.maxRequests) {
        throw new ApiError('Too many requests', 429);
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        LoggingManager.getInstance().error('Rate limiter error:', {
          error: error instanceof Error ? error.message : String(error)
        });
        next(new ApiError('Internal server error', 500));
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

