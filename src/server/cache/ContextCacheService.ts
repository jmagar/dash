import { RedisConfig } from '../../types/redis';
import { ContextManager } from './contexts/ContextManager';

/**
 * Main entry point for context caching functionality.
 * Delegates all operations to the ContextManager which coordinates
 * between different context services.
 */
export class ContextCacheService {
  private contextManager: ContextManager;

  constructor(config: RedisConfig) {
    this.contextManager = new ContextManager(config);
  }

  /**
   * Access to the context manager for direct service usage.
   */
  public get manager(): ContextManager {
    return this.contextManager;
  }

  /**
   * Shut down the context cache service and its dependencies.
   */
  public async shutdown(): Promise<void> {
    await this.contextManager.shutdown();
  }
}
