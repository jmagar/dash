import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { rateLimitConfig } from '../utils/security';
import { LoggingManager } from '../managers/LoggingManager';
import type { LogMetadata } from '../../types/logger';

interface RateLimitInfo {
  count: number;
  firstRequest: number;
}

interface RateLimitLogMetadata extends LogMetadata {
  ip: string;
  count: number;
  limit: number;
  ttl: number;
  timeRemaining?: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requestMap = new Map<string, RateLimitInfo>();
  private readonly logger = LoggingManager.getInstance();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
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
      const timeRemaining = Math.ceil(
        (rateLimitInfo.firstRequest + rateLimitConfig.ttl * 1000 - now) / 1000
      );

      const logMeta: RateLimitLogMetadata = {
        ip,
        count: rateLimitInfo.count,
        limit: rateLimitConfig.limit,
        ttl: rateLimitConfig.ttl,
        timeRemaining
      };

      this.logger.warn('Rate limit exceeded', logMeta);

      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit of ${rateLimitConfig.limit} requests per ${
            rateLimitConfig.ttl
          } seconds exceeded. Please try again in ${timeRemaining} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private cleanup(now: number): void {
    const expiredIps: string[] = [];

    // First collect expired IPs
    for (const [ip, info] of this.requestMap.entries()) {
      if (now - info.firstRequest > rateLimitConfig.ttl * 1000) {
        expiredIps.push(ip);
      }
    }

    // Then delete them and log
    if (expiredIps.length > 0) {
      expiredIps.forEach(ip => this.requestMap.delete(ip));
      
      this.logger.debug('Cleaned up expired rate limits', {
        expiredCount: expiredIps.length,
        remainingCount: this.requestMap.size
      });
    }
  }
}
