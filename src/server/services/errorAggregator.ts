import type { LogMetadata } from '../../types/logger';
import { LoggingManager } from '../utils/logging/LoggingManager';

interface ErrorGroup {
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  occurrences: ErrorOccurrence[];
  metadata: Record<string, unknown>;
}

interface ErrorOccurrence {
  timestamp: Date;
  requestId?: string;
  userId?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error aggregation service that groups similar errors and tracks their frequency
 */
class ErrorAggregator {
  private static instance: ErrorAggregator;
  private errorGroups: Map<string, ErrorGroup>;
  private readonly maxOccurrences: number;
  private readonly flushInterval: number;

  private constructor() {
    this.errorGroups = new Map();
    this.maxOccurrences = parseInt(process.env.ERROR_MAX_OCCURRENCES || '100');
    this.flushInterval = parseInt(process.env.ERROR_FLUSH_INTERVAL || '3600000'); // 1 hour

    // Periodically flush old errors
    setInterval(() => this.flushOldErrors(), this.flushInterval);
  }

  public static getInstance(): ErrorAggregator {
    if (!ErrorAggregator.instance) {
      ErrorAggregator.instance = new ErrorAggregator();
    }
    return ErrorAggregator.instance;
  }

  /**
   * Track an error occurrence and group similar errors
   */
  public trackError(error: Error, metadata: LogMetadata = {}) {
    const errorKey = this.getErrorKey(error);
    const occurrence: ErrorOccurrence = {
      timestamp: new Date(),
      requestId: metadata.requestId as string,
      userId: metadata.userId as string,
      stack: error.stack,
      metadata,
    };

    let group = this.errorGroups.get(errorKey);
    if (!group) {
      group = {
        count: 0,
        firstSeen: occurrence.timestamp,
        lastSeen: occurrence.timestamp,
        occurrences: [],
        metadata: {},
      };
      this.errorGroups.set(errorKey, group);
    }

    group.count++;
    group.lastSeen = occurrence.timestamp;
    group.metadata = this.mergeMetadata(group.metadata, metadata);

    // Keep only the most recent occurrences
    group.occurrences.unshift(occurrence);
    if (group.occurrences.length > this.maxOccurrences) {
      group.occurrences.pop();
    }

    // Log error frequency
    if (group.count === 1 || group.count === 10 || group.count === 100 || (group.count % 1000 === 0)) {
      LoggingManager.getInstance().warn('Error frequency alert:', {
        error: error.message,
        count: group.count,
        firstSeen: group.firstSeen,
        lastSeen: group.lastSeen,
        metadata: group.metadata,
      });
    }
  }

  /**
   * Get all error groups
   */
  public getErrorGroups(): Map<string, ErrorGroup> {
    return new Map(this.errorGroups);
  }

  /**
   * Get a specific error group
   */
  public getErrorGroup(error: Error): ErrorGroup | undefined {
    const errorKey = this.getErrorKey(error);
    return this.errorGroups.get(errorKey);
  }

  /**
   * Clear all error groups
   */
  public clearErrorGroups() {
    this.errorGroups.clear();
  }

  /**
   * Generate a unique key for an error to group similar errors
   */
  private getErrorKey(error: Error): string {
    // Create a key based on error name and message
    // Remove variable parts like line numbers and timestamps
    const normalizedMessage = error.message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/(['"])[^'"]*\1/g, '$1S$1') // Replace string contents with S
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return `${error.name}:${normalizedMessage}`;
  }

  /**
   * Merge metadata objects, combining arrays and nested objects
   */
  private mergeMetadata(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (Array.isArray(value)) {
        result[key] = Array.isArray(result[key])
          ? [...new Set([...result[key] as unknown[], ...value])]
          : value;
      } else if (value && typeof value === 'object') {
        result[key] = this.mergeMetadata(
          (result[key] as Record<string, unknown>) || {},
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Remove error groups older than the flush interval
   */
  private flushOldErrors() {
    const cutoff = new Date(Date.now() - this.flushInterval);
    let flushedCount = 0;

    for (const [key, group] of this.errorGroups.entries()) {
      if (group.lastSeen < cutoff) {
        this.errorGroups.delete(key);
        flushedCount++;
      }
    }

    if (flushedCount > 0) {
      LoggingManager.getInstance().info('Flushed old error groups:', { count: flushedCount });
    }
  }
}

export const errorAggregator = ErrorAggregator.getInstance();
export default errorAggregator;

