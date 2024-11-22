import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { rateLimitConfig } from '../utils/security';
import { logger } from '../../logger';

interface RateLimitInfo {
  count: number;
  firstRequest: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requestMap = new Map<string, RateLimitInfo>();

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip;
    const now = Date.now();

    // Clean up old entries
    this.cleanup(now);

    // Get or create rate limit info for this IP
    const rateLimitInfo = this.requestMap.get(ip) || {
      count: 0,
      firstRequest: now,
    };

    // If the time window has passed, reset the counter
    if (now - rateLimitInfo.firstRequest > rateLimitConfig.ttl * 1000) {
      rateLimitInfo.count = 0;
      rateLimitInfo.firstRequest = now;
    }

    // Increment the counter
    rateLimitInfo.count++;

    // Update the map
    this.requestMap.set(ip, rateLimitInfo);

    // Check if the limit has been exceeded
    if (rateLimitInfo.count > rateLimitConfig.limit) {
      logger.warn('Rate limit exceeded', {
        ip,
        count: rateLimitInfo.count,
        limit: rateLimitConfig.limit,
        component: 'RateLimitGuard',
      });

      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit of ${rateLimitConfig.limit} requests per ${
            rateLimitConfig.ttl
          } seconds exceeded. Please try again in ${Math.ceil(
            (rateLimitInfo.firstRequest + rateLimitConfig.ttl * 1000 - now) / 1000,
          )} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private cleanup(now: number): void {
    for (const [ip, info] of this.requestMap.entries()) {
      if (now - info.firstRequest > rateLimitConfig.ttl * 1000) {
        this.requestMap.delete(ip);
      }
    }
  }
}
