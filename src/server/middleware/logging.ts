import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { RequestLogMetadata, ResponseLogMetadata } from '../types/middleware';
import { monitoringService } from '../services/monitoring';
import { performance } from 'perf_hooks';

// Track request counts for different status codes
const requestMetrics = {
  total: 0,
  success: 0,
  clientError: 0,
  serverError: 0,
  avgResponseTime: 0,
};

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  
  // Attach requestId to request object for correlation
  req.requestId = requestId;
  
  // Create request metadata
  const requestMeta: RequestLogMetadata = {
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip || '',
    userAgent: req.get('user-agent'),
    query: req.query,
    body: req.body,
    startTime: start,
    correlationId: req.headers['x-correlation-id'],
    origin: req.get('origin'),
    referer: req.get('referer'),
  };

  // Log request with sanitized data
  const sanitizedMeta = {
    ...requestMeta,
    body: sanitizeRequestData(req.body),
    query: sanitizeRequestData(req.query),
  };
  logger.info('Request started', sanitizedMeta);

  // Track memory usage before processing
  const startMemory = process.memoryUsage();

  // Add response listener
  res.on('finish', () => {
    const duration = performance.now() - start;
    const statusCode = res.statusCode;

    // Update request metrics
    requestMetrics.total++;
    if (statusCode < 400) requestMetrics.success++;
    else if (statusCode < 500) requestMetrics.clientError++;
    else requestMetrics.serverError++;
    
    requestMetrics.avgResponseTime = 
      (requestMetrics.avgResponseTime * (requestMetrics.total - 1) + duration) / requestMetrics.total;

    const endMemory = process.memoryUsage();
    const memoryDiff = {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external,
      rss: endMemory.rss - startMemory.rss,
    };

    const responseMeta: ResponseLogMetadata & { memoryUsage?: Record<string, number> } = {
      ...requestMeta,
      statusCode,
      duration,
      responseSize: parseInt(res.get('content-length') || '0'),
      contentType: res.get('content-type'),
    };

    // Log based on status code and update monitoring
    if (statusCode >= 500) {
      logger.error('Request failed', responseMeta);
      monitoringService.updateServiceStatus('api', {
        name: 'api',
        status: 'degraded',
        error: `Internal Server Error: ${statusCode}`,
        lastCheck: new Date(),
        metadata: {
          endpoint: req.path,
          errorRate: requestMetrics.serverError / requestMetrics.total,
        },
      });
    } else if (statusCode >= 400) {
      logger.warn('Request failed', responseMeta);
      if (requestMetrics.clientError / requestMetrics.total > 0.1) {
        monitoringService.updateServiceStatus('api', {
          name: 'api',
          status: 'degraded',
          error: 'High rate of client errors',
          lastCheck: new Date(),
          metadata: {
            errorRate: requestMetrics.clientError / requestMetrics.total,
          },
        });
      }
    } else {
      logger.info('Request completed', responseMeta);
    }

    // Monitor response time thresholds
    const responseTimeThresholds = {
      warning: 1000,  // 1 second
      critical: 3000, // 3 seconds
    };

    if (duration > responseTimeThresholds.critical) {
      monitoringService.updateServiceStatus('api', {
        name: 'api',
        status: 'unhealthy',
        latency: duration,
        error: `Critical response time: ${duration.toFixed(2)}ms`,
        lastCheck: new Date(),
        metadata: {
          endpoint: req.path,
          avgResponseTime: requestMetrics.avgResponseTime,
        },
      });
    } else if (duration > responseTimeThresholds.warning) {
      monitoringService.updateServiceStatus('api', {
        name: 'api',
        status: 'degraded',
        latency: duration,
        error: `Slow response time: ${duration.toFixed(2)}ms`,
        lastCheck: new Date(),
        metadata: {
          endpoint: req.path,
          avgResponseTime: requestMetrics.avgResponseTime,
        },
      });
    }

    // Monitor memory usage
    const heapUsagePercent = (endMemory.heapUsed / endMemory.heapTotal) * 100;
    if (heapUsagePercent > 85) {
      monitoringService.updateServiceStatus('api', {
        name: 'api',
        status: 'degraded',
        error: `High memory usage: ${heapUsagePercent.toFixed(1)}%`,
        lastCheck: new Date(),
        metadata: { memoryUsage: endMemory },
      });
    }
  });

  next();
}

/**
 * Middleware to log slow requests with enhanced monitoring
 */
export function slowRequestLogger(threshold = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    const checkpoints: Record<string, number> = {};

    // Add checkpoint tracking to request object
    req.addCheckpoint = (name: string) => {
      checkpoints[name] = performance.now() - start;
    };

    res.on('finish', () => {
      const duration = performance.now() - start;
      
      if (duration > threshold) {
        const slowRequestMeta = {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          userId: req.user?.id,
          duration,
          threshold,
          checkpoints,
        };

        logger.warn('Slow request detected', slowRequestMeta);
        
        // Find slowest checkpoint
        const checkpointDurations = Object.entries(checkpoints).map(([name, time], index, arr) => ({
          name,
          duration: index === 0 ? time : time - arr[index - 1][1],
        }));
        
        const slowestCheckpoint = checkpointDurations.reduce((prev, current) => 
          current.duration > prev.duration ? current : prev
        );

        monitoringService.updateServiceStatus('api', {
          name: 'api',
          status: 'degraded',
          latency: duration,
          error: `Slow request: ${duration.toFixed(2)}ms > ${threshold}ms`,
          lastCheck: new Date(),
          metadata: {
            endpoint: req.path,
            slowestCheckpoint,
            checkpoints: checkpointDurations,
          },
        });
      }
    });

    next();
  };
}

// Helper function to sanitize sensitive data
function sanitizeRequestData(data: unknown): Record<string, unknown> {
  if (typeof data !== 'object' || data === null) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = value;
  }
  return sanitized;
}
