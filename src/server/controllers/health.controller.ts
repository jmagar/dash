import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileSystemManager } from '../services/filesystem/filesystem.manager';
import { HealthCheckResponse } from '../../types/health';
import { logger } from '../../logger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly filesystemManager: FileSystemManager) {}

  @Get()
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, type: HealthCheckResponse })
  async getHealth(): Promise<HealthCheckResponse> {
    const startTime = process.hrtime();
    
    try {
      // Check active connections
      const activeConnections = this.filesystemManager['activeConnections'].size;
      
      // Calculate response time
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;

      const health: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime,
        memory: {
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
        },
        connections: {
          active: activeConnections,
        },
      };

      logger.info('Health check completed', {
        status: health.status,
        responseTime,
        component: 'HealthController',
      });

      return health;
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'HealthController',
      });

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: -1,
        error: error instanceof Error ? error.message : 'System health check failed',
      };
    }
  }
}