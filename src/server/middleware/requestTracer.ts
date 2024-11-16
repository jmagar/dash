import { performance } from 'perf_hooks';
import type { Response, NextFunction } from 'express';
import type { Request } from '../../types/express';
import type { LogMetadata, LogContext } from '../../types/logger';
import { logger } from '../utils/logger';

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
  res.removeAllListeners("finish");
  res.removeAllListeners("error");
  if (res.__originalJson) {
    res.json = res.__originalJson;
    delete res.__originalJson;
  }
}

/**
 * Converts RequestTiming to the format expected by LogMetadata
 */
function formatTiming(timing: RequestTiming | undefined) {
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
export function requestTracer(req: Request, res: Response, next: NextFunction) {
  const startTime = performance.now();

  // Store timing information
  timings.set(req, {
    startTime,
    dbTime: 0,
    processingTime: 0,
  });

  // Create child logger with request context
  const context: LogContext = {
    requestId: req.requestId,
    userId: req.user?.id,
  };

  const requestLogger = logger.withContext(context);

  // Wrap json method to capture response data
  const extendedRes = res as ExtendedResponse;
  extendedRes.__originalJson = res.json;
  extendedRes.json = function(body) {
    const timing = timings.get(req);
    if (timing) {
      timing.processingTime = performance.now() - timing.startTime;
    }

    const metadata: LogMetadata = {
      requestId: req.requestId,
      userId: req.user?.id,
      timing: formatTiming(timing),
      responseSize: JSON.stringify(body).length,
    };

    requestLogger.info('Request completed', metadata);

    if (extendedRes.__originalJson) {
      return extendedRes.__originalJson.call(this, body);
    }
    return res.json.call(this, body);
  };

  // Handle request completion
  res.on('finish', () => {
    const timing = timings.get(req);
    if (timing) {
      const totalTime = performance.now() - timing.startTime;
      timing.processingTime = totalTime;

      const metadata: LogMetadata = {
        requestId: req.requestId,
        userId: req.user?.id,
        statusCode: res.statusCode,
        timing: formatTiming(timing),
      };

      if (totalTime > 1000) {
        requestLogger.warn('Slow request detected', metadata);
      } else {
        requestLogger.debug('Request timing', metadata);
      }
    }

    cleanupRequest(req, extendedRes);
  });

  // Handle request errors
  res.on('error', (error: Error) => {
    const timing = timings.get(req);
    if (timing) {
      const totalTime = performance.now() - timing.startTime;
      timing.processingTime = totalTime;

      const metadata: LogMetadata = {
        requestId: req.requestId,
        userId: req.user?.id,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        timing: formatTiming(timing),
      };

      requestLogger.error('Request error', metadata);
    }

    cleanupRequest(req, extendedRes);
  });

  next();
}

/**
 * Performance monitoring middleware that tracks response times
 * and reports slow requests
 */
export function performanceMonitor(threshold = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();

    res.on('finish', () => {
      const duration = performance.now() - start;
      if (duration > threshold) {
        logger.warn('Slow request detected', {
          requestId: req.requestId,
          userId: req.user?.id,
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
        });
      }
    });

    next();
  };
}
