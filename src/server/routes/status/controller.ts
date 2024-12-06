import { Request, Response } from 'express';
import { monitoringService } from '../../services/monitoring';
import { HealthCheckResponse } from '../../types/middleware';
import { LoggingService } from '../../services/logging/logging.service';

const logger = new LoggingService({ component: 'StatusController' });

/**
 * Get detailed system status (protected endpoint)
 */
export async function getStatus(req: Request, res: Response) {
  try {
    const health = await monitoringService.performHealthCheck();
    res.json(health);
  } catch (error) {
    logger.error('Failed to get system status', {
      error: error instanceof Error ? error : new Error(String(error)),
      path: req.path,
      method: req.method
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get system status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Basic health check endpoint (public)
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    const health = await monitoringService.performHealthCheck();
    const response: Partial<HealthCheckResponse> = {
      status: health.status,
      timestamp: health.timestamp,
      version: health.version
    };

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 429 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error : new Error(String(error)),
      path: req.path,
      method: req.method
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
