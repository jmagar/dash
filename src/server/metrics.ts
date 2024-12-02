import type { Application, Request, Response, NextFunction } from 'express';
import type { Server as SocketServer } from 'socket.io';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';
import { logger } from './utils/logger';

// Create a new registry
const register = new Registry();

// Enable default metrics collection
collectDefaultMetrics({ register });

// Define metric types
type MetricLabels = {
  method: string;
  route: string;
  status_code: string;
};

type ErrorLabels = {
  method: string;
  route: string;
  error_type: string;
};

type HostMetricLabels = {
  host_id: string;
  metric_type: string;
};

type OperationLabels = {
  operation: string;
  success: string;
  service: string;
};

type ServiceMetricLabels = {
  service: string;
  metric_type: string;
};

// Create metrics with proper typing
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const apiErrors = new Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

const hostMetrics = new Gauge({
  name: 'host_metrics',
  help: 'Host system metrics',
  labelNames: ['host_id', 'metric_type'],
  registers: [register],
});

const operationDuration = new Histogram({
  name: 'operation_duration_seconds',
  help: 'Duration of service operations in seconds',
  labelNames: ['operation', 'success', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const operationCounter = new Counter({
  name: 'operation_total',
  help: 'Total number of service operations',
  labelNames: ['operation', 'success', 'service'],
  registers: [register],
});

const serviceMetrics = new Gauge({
  name: 'service_metrics',
  help: 'Service-level metrics',
  labelNames: ['service', 'metric_type'],
  registers: [register],
});

/**
 * Setup application metrics middleware
 */
export function setupMetrics(app: Application, io: SocketServer): void {
  // Add request metrics middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const labels: MetricLabels = {
        method: req.method,
        route: req.path,
        status_code: res.statusCode.toString(),
      };

      httpRequestDuration.observe(labels, duration / 1000);

      if (res.statusCode >= 400) {
        const errorLabels: ErrorLabels = {
          method: req.method,
          route: req.path,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        };
        apiErrors.inc(errorLabels);
      }
    });

    next();
  });

  // Setup WebSocket metrics using existing Socket.IO instance
  io.on('connection', (socket) => {
    const hostId = socket.handshake.query.hostId as string;
    if (hostId) {
      hostMetrics.set({ host_id: hostId, metric_type: 'connected' }, 1);

      socket.on('disconnect', () => {
        handleSocketDisconnect(hostId);
      });
    }
  });

  // Expose metrics endpoint
  app.get('/metrics', (req: Request, res: Response) => {
    register.metrics()
      .then(metrics => {
        res.set('Content-Type', register.contentType);
        res.send(metrics);
      })
      .catch(error => {
        logger.error('Error generating metrics', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).send('Error generating metrics');
      });
  });

  logger.info('Metrics setup complete');
}

// Handle socket disconnect
function handleSocketDisconnect(hostId: string): void {
  try {
    hostMetrics.set({ host_id: hostId, metric_type: 'connected' }, 0);
  } catch (error) {
    logger.error('Error handling socket disconnect', {
      error: error instanceof Error ? error.message : 'Unknown error',
      hostId
    });
  }
}

// Export metrics interface
export const metrics = {
  httpRequestDuration,
  apiErrors,
  operationDuration,
  hostMetrics,
  serviceMetrics,
  initialize(): void {
    logger.info('Initializing metrics collection...');
    collectDefaultMetrics({ register });
  },
  cleanup(): void {
    logger.info('Cleaning up metrics...');
    register.clear();
  },
  histogram(name: string, value: number, labels: Record<string, string | number>): void {
    operationDuration.observe(value / 1000, labels); // Convert ms to seconds
  },
  increment(name: string, value: number, labels: Record<string, string | number>): void {
    operationCounter.inc(labels, value);
  },
  gauge(name: string, value: number, labels: Record<string, string | number> = {}): void {
    serviceMetrics.set({ ...labels, metric_type: name }, value);
  },
  observeHttpDuration(method: string, route: string, statusCode: string, duration: number): void {
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  },
  incrementApiError(method: string, route: string, errorType: string): void {
    apiErrors.inc({ method, route, error_type: errorType });
  }
};

// Helper functions
export function recordHostMetric(hostId: string, metricType: string, value: number): void {
  hostMetrics.set({ host_id: hostId, metric_type: metricType }, value);
}

export type { MetricLabels, ErrorLabels, HostMetricLabels, OperationLabels, ServiceMetricLabels };
