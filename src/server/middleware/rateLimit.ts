import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../types/errors';
import { RateLimitConfig } from '../types/middleware';
import { logger } from '../utils/logger';
import { monitoringService } from '../services/monitoring';

// Helper to create a rate limiter with monitoring
const createLimiter = (config: RateLimitConfig) => rateLimit({
  windowMs: config.windowMs,
  max: config.max,
  skipSuccessfulRequests: config.skipSuccessfulRequests,
  skip: config.skip,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    const error = ApiError.tooManyRequests(
      config.message || 'Too many requests, please try again later'
    );
    
    logger.warn('Rate limit exceeded:', {
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

    // Update monitoring metrics
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
});

// General API rate limit
export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  skipSuccessfulRequests: false
});

// Sensitive operations rate limit (e.g. login attempts)
export const sensitiveOpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many sensitive operations attempted, please try again later',
  skipSuccessfulRequests: true
});
