import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

import type { Response as ExpressResponse, NextFunction } from 'express-serve-static-core';

import type { Request } from '../../types/express';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

type Response = ExpressResponse;

interface RequestTiming {
  startTime: number;
  dbTime: number;
  processingTime: number;
}

const timings = new WeakMap<Request, RequestTiming>();

/**
 * Request tracing middleware that adds timing information
 * to help track requests through the system.
 */
export function requestTracer(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();

  // Store timing information
  timings.set(req, {
    startTime,
    dbTime: 0,
    processingTime: 0,
  });

  // Create child logger with request context
  const requestLogger = logger.withContext({
    component: 'HTTP',
    requestId: req.requestId,
    userId: req.user?.id,
  });

  // Log request start with detailed metadata
  const metadata: LogMetadata = {
    method: req.method,
    url: req.url,
    path: req.path,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    correlationId: req.get('x-correlation-id'),
    sessionId: req.get('x-session-id'),
  };

  requestLogger.info('Request started:', metadata);

  // Track response time
  const startHrTime = process.hrtime();

  // Patch response methods to track timing
  const originalJson = res.json.bind(res);
  res.json = function(body: any): Response {
    const timing = timings.get(req);
    if (timing) {
      timing.processingTime = performance.now() - timing.startTime;
    }
    return originalJson(body);
  };

  // Add response listener to log completion
  res.on('finish', () => {
    const timing = timings.get(req);
    const diff = process.hrtime(startHrTime);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    const responseMetadata: LogMetadata = {
      ...metadata,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length'),
      timing: timing ? {
        total: timing.processingTime,
        db: timing.dbTime,
        processing: timing.processingTime - timing.dbTime,
      } : undefined,
    };

    if (res.statusCode >= 500) {
      requestLogger.error('Request failed:', responseMetadata);
    } else if (res.statusCode >= 400) {
      requestLogger.warn('Request failed:', responseMetadata);
    } else {
      requestLogger.info('Request completed:', responseMetadata);
    }

    // Cleanup timing data
    timings.delete(req);
  });

  // Add response listener to log errors
  res.on('error', (error: Error) => {
    const timing = timings.get(req);
    const diff = process.hrtime(startHrTime);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    const errorMetadata: LogMetadata = {
      ...metadata,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      responseTime: `${responseTime}ms`,
      timing: timing ? {
        total: timing.processingTime,
        db: timing.dbTime,
        processing: timing.processingTime - timing.dbTime,
      } : undefined,
    };

    requestLogger.error('Request error:', errorMetadata);
    timings.delete(req);
  });

  // Add helper to get request logger
  res.locals.logger = requestLogger;

  // Add helper to track DB time
  res.locals.trackDbTime = (time: number): void => {
    const timing = timings.get(req);
    if (timing) {
      timing.dbTime += time;
    }
  };

  next();
}

/**
 * Performance monitoring middleware that tracks response times
 * and reports slow requests
 */
export function performanceMonitor(threshold = 1000): (req: Request, res: Response, next: NextFunction) => void {
  return function(req: Request, res: Response, next: NextFunction): void {
    const start = performance.now();

    res.on('finish', () => {
      const duration = performance.now() - start;
      if (duration > threshold) {
        const timing = timings.get(req);
        logger.warn('Slow request detected:', {
          method: req.method,
          url: req.url,
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          timing: timing ? {
            total: timing.processingTime,
            db: timing.dbTime,
            processing: timing.processingTime - timing.dbTime,
          } : undefined,
        });
      }
    });

    next();
  };
}
