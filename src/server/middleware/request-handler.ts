import { Request, Response, NextFunction } from 'express';
import { 
  LoggingManager,
  MetricsManager,
  RequestManager,
  MonitoringManager
} from '../managers';
import { ApiError } from '../utils/errors';

export interface RequestContext {
  requestId: string;
  startTime: number;
  path: string;
  method: string;
  userId?: string;
}

export const requestHandler = () => {
  const loggingManager = LoggingManager.getInstance();
  const metricsManager = MetricsManager.getInstance();
  const requestManager = RequestManager.getInstance();
  const monitoringManager = MonitoringManager.getInstance();

  return async (req: Request, res: Response, next: NextFunction) => {
    const requestId = requestManager.generateRequestId();
    const startTime = Date.now();

    // Attach context to request for logging and metrics
    req.context = requestManager.createRequestContext(req, requestId);

    // Log request start
    loggingManager.logRequest(req);

    // Track request metrics
    metricsManager.incrementCounter('http_requests_total', {
      method: req.method,
      path: req.path
    });

    // Monitor request health
    monitoringManager.trackRequest(req);

    // Override res.json to track response time and log completion
    const originalJson = res.json;
    res.json = function(body: any) {
      const duration = Date.now() - startTime;

      // Track response metrics
      requestManager.trackResponse(req, res, duration);
      
      // Log completion
      loggingManager.logResponse(req, res, duration);

      return originalJson.call(this, body);
    };

    try {
      await next();
    } catch (error) {
      const apiError = error instanceof ApiError 
        ? error 
        : new ApiError('Internal Server Error', 500, { cause: error });

      requestManager.handleError(apiError, req, res);
      next(apiError);
    }
  };
};
