export interface LogMetadata {
  [key: string]: unknown;
}

export class LoggingManager {
  private static instance: LoggingManager;

  private constructor() {}

  public static getInstance(): LoggingManager {
    if (!LoggingManager.instance) {
      LoggingManager.instance = new LoggingManager();
    }
    return LoggingManager.instance;
  }

  public info(message: string, metadata?: LogMetadata): void {
    console.log(`[INFO] ${message}`, metadata || '');
  }

  public error(message: string, metadata?: LogMetadata): void {
    console.error(`[ERROR] ${message}`, metadata || '');
  }
} 