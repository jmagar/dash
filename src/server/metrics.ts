import type { Application, Request, Response, NextFunction } from 'express';
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
  LabelValues,
  MetricConfiguration,
} from 'prom-client';
import { logger } from './utils/logger';

// Define metric label types
interface MetricLabels {
  method: string;
  route: string;
  status_code: string;
}

interface ErrorLabels {
  method: string;
  route: string;
  error_type: string;
}

interface ConnectionLabels {
  status: 'connected' | 'disconnected';
}

interface HostMetricLabels {
  host_id: string;
  metric_type: string;
}

// Create a new registry
const register = new Registry();

// Create metric instances with proper typing
const httpRequestDuration = new Histogram<keyof MetricLabels>({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
} as MetricConfiguration<keyof MetricLabels>);

const apiErrors = new Counter<keyof ErrorLabels>({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
} as MetricConfiguration<keyof ErrorLabels>);

const activeConnections = new Counter<keyof ConnectionLabels>({
  name: 'websocket_connections_total',
  help: 'Total number of WebSocket connections',
  labelNames: ['status'],
  registers: [register],
} as MetricConfiguration<keyof ConnectionLabels>);

const hostMetrics = new Gauge<keyof HostMetricLabels>({
  name: 'host_metrics',
  help: 'Host system metrics',
  labelNames: ['host_id', 'metric_type'],
  registers: [register],
} as MetricConfiguration<keyof HostMetricLabels>);

/**
 * Setup application metrics
 */
export function setupMetrics(app: Application): void {
  // Enable the collection of default metrics
  collectDefaultMetrics({ register });

  // Add request metrics middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const labels: LabelValues<keyof MetricLabels> = {
        method: req.method,
        route: req.path,
        status_code: res.statusCode.toString(),
      };

      httpRequestDuration.observe(labels, duration / 1000);

      if (res.statusCode >= 400) {
        const errorLabels: LabelValues<keyof ErrorLabels> = {
          method: req.method,
          route: req.path,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        };
        apiErrors.inc(errorLabels);
      }
    });

    next();
  });

  // Setup WebSocket metrics with proper HTTP server
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer);

  io.on('connection', (socket) => {
    const connectedLabel: LabelValues<keyof ConnectionLabels> = {
      status: 'connected',
    };
    activeConnections.inc(connectedLabel);

    socket.on('disconnect', () => {
      const disconnectedLabel: LabelValues<keyof ConnectionLabels> = {
        status: 'disconnected',
      };
      activeConnections.inc(disconnectedLabel);
    });
  });

  // Start the HTTP server
  const port = process.env.METRICS_PORT || 9090;
  httpServer.listen(port, () => {
    logger.info(`Metrics server listening on port ${port}`);
  });

  // Expose metrics endpoint
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      const metrics = await register.metrics();
      res.set('Content-Type', register.contentType);
      res.send(metrics);
    } catch (error) {
      logger.error('Error generating metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).send('Error generating metrics');
    }
  });

  logger.info('Metrics setup complete');
}

// Export metrics interface with proper typing
export interface MetricsInterface {
  httpRequestDuration: Histogram<keyof MetricLabels>;
  apiErrors: Counter<keyof ErrorLabels>;
  activeConnections: Counter<keyof ConnectionLabels>;
  hostMetrics: Gauge<keyof HostMetricLabels>;
  register: Registry;
}

// Export metrics instance
export const metrics: MetricsInterface = {
  httpRequestDuration,
  apiErrors,
  activeConnections,
  hostMetrics,
  register,
};

// Helper functions with proper typing
export function recordHostMetric(hostId: string, metricType: string, value: number): void {
  const labels: LabelValues<keyof HostMetricLabels> = {
    host_id: hostId,
    metric_type: metricType,
  };
  hostMetrics.set(labels, value);
}

export function incrementApiError(method: string, route: string, errorType: string): void {
  const labels: LabelValues<keyof ErrorLabels> = {
    method,
    route,
    error_type: errorType,
  };
  apiErrors.inc(labels);
}

export function observeRequestDuration(method: string, route: string, statusCode: string, duration: number): void {
  const labels: LabelValues<keyof MetricLabels> = {
    method,
    route,
    status_code: statusCode,
  };
  httpRequestDuration.observe(labels, duration);
}

export function trackWebSocketConnection(status: 'connected' | 'disconnected'): void {
  const labels: LabelValues<keyof ConnectionLabels> = { status };
  activeConnections.inc(labels);
}
