interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}

class Logger {
  private level: string;
  private prefix: string;

  constructor(options: LoggerOptions) {
    this.level = options.level;
    this.prefix = options.prefix || '';
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    const dataString = data ? ` ${JSON.stringify(data)}` : '';
    return `${timestamp} ${prefix}${level.toUpperCase()}: ${message}${dataString}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.level === 'debug') {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.level === 'debug' || this.level === 'info') {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.level !== 'error') {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: unknown): void {
    console.error(this.formatMessage('error', message, data));
  }
}

export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  prefix: 'Client',
});
