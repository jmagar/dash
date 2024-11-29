import { performance } from 'perf_hooks';
import type { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { logger } from '../utils/logger';
import { monitoringService } from '../services/monitoring';

export interface RequestTiming {
  startTime: number;
  dbTime: number;
  processingTime: number;
}

type JsonResponseFunction = <T>(body: T) => Response;

interface ExtendedResponse extends Response {
  __originalJson?: JsonResponseFunction;
}

const timings = new WeakMap<Request, RequestTiming>();

/**
 * Safely cleans up request timing data and event listeners
 */
function cleanupRequest(req: Request, res: ExtendedResponse): void {
  timings.delete(req);
  res.removeAllListeners('finish');
  res.removeAllListeners('error');
  if (res.__originalJson) {
    res.json = res.__originalJson;
    delete res.__originalJson;
  }
}

/**
 * Converts RequestTiming to the format expected by log metadata
 */
function formatTiming(timing: RequestTiming | undefined): {
  total: number;
  db: number;
  processing: number;
} | undefined {
  if (!timing) return undefined;

  return {
    total: timing.processingTime,
    db: timing.dbTime,
    processing: timing.processingTime - timing.dbTime
  };
}

/**
 * Request tracing middleware that adds timing information
 * to help track requests through the system.
 */
export function requestTracer(req: Request, res: Response, next: NextFunction): void {
  // Initialize timing data
  const timing: RequestTiming = {
    startTime: performance.now(),
    dbTime: 0,
    processingTime: 0
  };
  timings.set(req, timing);

  // Save original json function
  const extendedRes = res as ExtendedResponse;
  extendedRes.__originalJson = res.json;

  // Override json to capture response data
  extendedRes.json = function<T>(body: T): Response {
    timing.processingTime = performance.now() - timing.startTime;

    const metadata = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      timing: formatTiming(timing)
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Server error response:', metadata);
      void monitoringService.updateServiceStatus('api', {
        name: 'api',
        status: 'unhealthy',
        error: 'Server error occurred',
        lastCheck: new Date()
      });
    } else if (res.statusCode >= 400) {
      logger.warn('Client error response:', metadata);
    } else {
      logger.info('Request completed:', metadata);
    }

    if (extendedRes.__originalJson) {
      return extendedRes.__originalJson.call(res, body);
    }
    return res;
  };

  // Handle request completion
  res.on('finish', () => {
    cleanupRequest(req, extendedRes);
  });

  // Handle request errors
  res.on('error', (error: Error) => {
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      path: req.path,
      requestId: req.requestId
    });
    cleanupRequest(req, extendedRes);
  });

  next();
}

/**
 * Performance monitoring middleware that tracks response times
 * and reports slow requests
 */
export function performanceMonitor(threshold = 1000) {
  return function(req: Request, res: Response, next: NextFunction): void {
    const start = performance.now();

    res.on('finish', () => {
      const duration = performance.now() - start;
      if (duration > threshold) {
        logger.warn('Slow request detected:', {
          duration,
          method: req.method,
          path: req.path,
          requestId: req.requestId,
          threshold
        });

        void monitoringService.updateServiceStatus('api', {
          name: 'api',
          status: 'degraded',
          error: `Slow request detected (${Math.round(duration)}ms)`,
          lastCheck: new Date()
        });
      }
    });

    next();
  };
}
