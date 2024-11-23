import { createLogger, format, transports } from 'winston';
import * as Transport from 'winston-transport';
import { Syslog } from 'winston-syslog';
import { BaseService } from '../base.service';
import type { LogMetadata } from '../../../types/logger';

export interface SyslogConfig {
  host?: string;
  port?: number;
  protocol?: 'udp' | 'tcp';
  path?: string;
  facility?: string;
  app_name?: string;
  eol?: string;
}

export class SyslogService extends BaseService {
  private readonly logger: any;
  private readonly syslogTransport: Transport;

  constructor(config: SyslogConfig = {}) {
    super();

    // Configure syslog transport
    this.syslogTransport = new Syslog({
      host: config.host || 'localhost',
      port: config.port || 514,
      protocol: config.protocol || 'udp',
      path: config.path,
      facility: config.facility || 'local0',
      app_name: config.app_name || 'dash',
      eol: config.eol || '\n',
      format: format.combine(
        format.timestamp(),
        format.json()
      )
    });

    // Create winston logger with syslog transport
    this.logger = createLogger({
      transports: [this.syslogTransport],
      format: format.combine(
        format.timestamp(),
        format.json()
      )
    });
  }

  // Log Levels
  debug(message: string, metadata?: LogMetadata) {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: LogMetadata) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: LogMetadata) {
    this.log('error', message, metadata);
  }

  // Structured Logging
  private log(level: string, message: string, metadata?: LogMetadata) {
    try {
      const enrichedMetadata = this.enrichMetadata(metadata);
      this.logger[level](message, enrichedMetadata);
    } catch (error) {
      // Fallback to base logger if syslog fails
      super.logger[level](message, metadata);
      super.handleError(error, { operation: 'syslog_write', level, message });
    }
  }

  // Metadata Enrichment
  private enrichMetadata(metadata?: LogMetadata): LogMetadata {
    return {
      ...metadata,
      service: 'dash',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
  }

  // Resource Cleanup
  async cleanup(): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        this.logger.on('finish', resolve);
        this.logger.end();
      });
    } catch (error) {
      super.handleError(error, { operation: 'syslog_cleanup' });
    }
  }
}

// Export singleton instance
let syslogServiceInstance: SyslogService | null = null;

export function getSyslogService(config?: SyslogConfig): SyslogService {
  if (!syslogServiceInstance) {
    syslogServiceInstance = new SyslogService(config);
  }
  return syslogServiceInstance;
}
