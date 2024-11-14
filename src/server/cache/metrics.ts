import { EventEmitter } from 'events';
import type Redis from 'ioredis';
import { ConnectionState, ConnectionMetrics } from './types';
import { RedisError, RedisErrorCode } from './errors';

export interface RedisMetrics extends ConnectionMetrics {
  state: ConnectionState;
  lastError?: Error;
}

export class RedisMetricsCollector extends EventEmitter {
  private metrics: RedisMetrics;
  private collectionInterval: NodeJS.Timeout | null;
  private readonly client: Redis;
  private readonly intervalMs: number;

  constructor(client: Redis, intervalMs = 5000) {
    super();
    this.client = client;
    this.intervalMs = intervalMs;
    this.collectionInterval = null;
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): RedisMetrics {
    return {
      state: ConnectionState.DISCONNECTED,
      memory: {
        used: 0,
        peak: 0,
        fragmentation: 0,
        limit: 0,
      },
      keys: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      connectedClients: 0,
      operationsPerSecond: 0,
      lastUpdate: new Date(),
    };
  }

  public start(): void {
    if (this.collectionInterval) {
      return;
    }

    this.collectionInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        this.emit('metrics', this.metrics);
      } catch (error) {
        this.emit('error', new RedisError({
          code: RedisErrorCode.METRICS_COLLECTION_ERROR,
          message: 'Failed to collect Redis metrics',
          cause: error instanceof Error ? error : new Error(String(error)),
        }));
      }
    }, this.intervalMs);
  }

  public stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  public getMetrics(): RedisMetrics {
    return { ...this.metrics };
  }

  public updateConnectionState(state: ConnectionState, error?: Error): void {
    this.metrics.state = state;
    if (error) {
      this.metrics.lastError = error;
    }
    this.metrics.lastUpdate = new Date();
    this.emit('metrics', this.metrics);
  }

  private async collectMetrics(): Promise<void> {
    if (!this.client.status || this.client.status !== 'ready') {
      throw new RedisError({
        code: RedisErrorCode.CLIENT_NOT_READY,
        message: 'Redis client is not ready for metrics collection',
      });
    }

    const info = await this.client.info();
    const memory = await this.client.info('memory');
    const stats = await this.client.info('stats');

    // Parse memory metrics
    const usedMemory = this.parseInfoValue(memory, 'used_memory');
    const peakMemory = this.parseInfoValue(memory, 'used_memory_peak');
    const memoryFragmentation = this.parseInfoValue(memory, 'mem_fragmentation_ratio');
    const maxMemory = this.parseInfoValue(memory, 'maxmemory');

    // Parse stats metrics
    const keyspaceHits = this.parseInfoValue(stats, 'keyspace_hits');
    const keyspaceMisses = this.parseInfoValue(stats, 'keyspace_misses');
    const totalConnections = this.parseInfoValue(info, 'connected_clients');
    const totalCommands = this.parseInfoValue(stats, 'total_commands_processed');

    // Calculate hit rate
    const hitRate = keyspaceHits + keyspaceMisses > 0
      ? keyspaceHits / (keyspaceHits + keyspaceMisses)
      : 0;

    // Update metrics
    this.metrics = {
      ...this.metrics,
      memory: {
        used: usedMemory,
        peak: peakMemory,
        fragmentation: memoryFragmentation,
        limit: maxMemory,
      },
      keys: await this.client.dbsize(),
      hits: keyspaceHits,
      misses: keyspaceMisses,
      hitRate,
      connectedClients: totalConnections,
      operationsPerSecond: totalCommands,
      lastUpdate: new Date(),
    };
  }

  private parseInfoValue(info: string, key: string): number {
    const match = new RegExp(`^${key}:(.+)$`, 'm').exec(info);
    if (!match) {
      return 0;
    }
    const value = parseFloat(match[1]);
    return isNaN(value) ? 0 : value;
  }
}
