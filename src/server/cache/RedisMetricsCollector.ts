import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import {
  RedisMetrics,
  RedisMemoryMetrics,
  RedisConnectionMetrics,
  RedisOperationsMetrics,
  RedisMetricsConfig,
  RedisError,
  RedisErrorCode,
} from '../../types/redis';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { getErrorMessage, wrapError } from './utils/error';

export class RedisMetricsCollector extends EventEmitter {
  private client: Redis;
  private config: RedisMetricsConfig;
  private collectInterval: NodeJS.Timeout | null = null;
  private lastMetrics: RedisMetrics | null = null;
  private lastCollectionTime = 0;
  private previousCommandCount = 0;

  constructor(client: Redis, config: RedisMetricsConfig) {
    super();
    this.client = client;
    this.config = config;
  }

  public start(): void {
    if (!this.config.enabled) return;
    if (this.collectInterval) return;

    // Collect metrics immediately on start
    void this.collectMetrics();

    this.collectInterval = setInterval(
      () => void this.collectMetrics(),
      this.config.interval
    );

    LoggingManager.getInstance().info('Redis metrics collector started', {
      interval: this.config.interval,
      detailed: this.config.detailed,
    });
  }

  public stop(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
      LoggingManager.getInstance().info('Redis metrics collector stopped');
    }
  }

  public async getLastMetrics(): Promise<RedisMetrics | null> {
    if (!this.lastMetrics || Date.now() - this.lastCollectionTime > this.config.interval) {
      await this.collectMetrics();
    }
    return this.lastMetrics;
  }

  private async collectMetrics(): Promise<void> {
    const startTime = Date.now();

    try {
      const [info, memory, slowlog] = await Promise.all([
        this.clientLoggingManager.getInstance().(),
        this.client.memory('stats'),
        this.config.detailed ? this.client.slowlog('get', 10) : Promise.resolve([]),
      ]);

      const metrics = this.parseMetrics(info, memory);
      
      // Add detailed metrics if enabled
      if (this.config.detailed) {
        const detailedMetrics = await this.collectDetailedMetrics(slowlog);
        Object.assign(metrics, { detailed: detailedMetrics });
      }

      // Calculate actual operations per second
      if (this.lastCollectionTime > 0) {
        const timeDiff = (Date.now() - this.lastCollectionTime) / 1000;
        const commandDiff = metrics.operations.totalCommands - this.previousCommandCount;
        metrics.operations.opsPerSecond = Math.round(commandDiff / timeDiff);
      }

      this.previousCommandCount = metrics.operations.totalCommands;
      this.lastCollectionTime = Date.now();
      this.lastMetrics = metrics;

      this.emit('metrics:update', metrics);

      // Check memory warning threshold
      if (metrics.memory.usedMemory > 0 && this.config.warningThreshold) {
        const memoryUsage = metrics.memory.usedMemory / metrics.memory.peakMemory;
        if (memoryUsage > this.config.warningThreshold) {
          this.emit('memory:warning', memoryUsage);
          LoggingManager.getInstance().warn('Redis memory usage exceeds threshold', {
            usage: memoryUsage,
            threshold: this.config.warningThreshold,
            usedMemory: metrics.memory.usedMemory,
            peakMemory: metrics.memory.peakMemory,
            evictedKeys: metrics.memory.evictedKeys,
          });
        }
      }

      // Log collection duration if it takes too long
      const duration = Date.now() - startTime;
      if (duration > this.config.interval * 0.1) { // Log if collection takes >10% of interval
        LoggingManager.getInstance().warn('Redis metrics collection took longer than expected', {
          duration,
          interval: this.config.interval,
        });
      }
    } catch (error) {
      const redisError = wrapError(error, 'Failed to collect Redis metrics', {
        service: this.constructor.name,
        operation: 'collectMetrics',
        interval: this.config.interval,
        detailed: this.config.detailed,
        duration: Date.now() - startTime,
      });
      
      this.emit('error', redisError);
      LoggingManager.getInstance().error('Redis metrics collection failed', { error: redisError.toJSON() });
    }
  }

  private async collectDetailedMetrics(slowlog: any[]): Promise<Record<string, unknown>> {
    try {
      const [dbSize, clientList] = await Promise.all([
        this.client.dbsize(),
        this.client.client('list'),
      ]);

      const clientStats = this.parseClientList(clientList);

      return {
        dbSize,
        slowlog: this.parseSlowLog(slowlog),
        clients: clientStats,
        customMetrics: this.config.customMetrics,
      };
    } catch (error) {
      LoggingManager.getInstance().error('Failed to collect detailed metrics', {
        error: getErrorMessage(error),
      });
      return {};
    }
  }

  private parseClientList(clientList: string): Record<string, number> {
    const stats = {
      total: 0,
      blocked: 0,
      connected: 0,
      maxMemory: 0,
    };

    clientList.split('\n').forEach((client) => {
      if (!client) return;
      stats.total++;
      
      if (client.includes('blocked:1')) stats.blocked++;
      if (client.includes('flags=N')) stats.connected++;
      
      const memMatch = client.match(/omem=(\d+)/);
      if (memMatch) {
        stats.maxMemory = Math.max(stats.maxMemory, parseInt(memMatch[1]));
      }
    });

    return stats;
  }

  private parseSlowLog(slowlog: any[]): Array<Record<string, unknown>> {
    return slowlog.map((entry) => ({
      id: entry[0],
      timestamp: entry[1],
      duration: entry[2],
      command: entry[3],
      clientName: entry[4],
      clientAddress: entry[5],
    }));
  }

  private parseMetrics(info: string, memory: Record<string, string>): RedisMetrics {
    try {
      const sections = this.parseInfo(info);
      
      const memoryMetrics: RedisMemoryMetrics = {
        usedMemory: parseInt(sections.memory['used_memory'] || '0'),
        peakMemory: parseInt(sections.memory['used_memory_peak'] || '0'),
        fragmentationRatio: parseFloat(sections.memory['mem_fragmentation_ratio'] || '0'),
        evictedKeys: parseInt(sections.stats['evicted_keys'] || '0'),
        blockedClients: parseInt(sections.clients['blocked_clients'] || '0'),
      };

      const connectionMetrics: RedisConnectionMetrics = {
        connectedClients: parseInt(sections.clients['connected_clients'] || '0'),
        blockedClients: parseInt(sections.clients['blocked_clients'] || '0'),
        rejectionsPerSecond: parseInt(sections.stats['rejected_connections'] || '0') / (this.config.interval / 1000),
        totalConnections: parseInt(sections.stats['total_connections_received'] || '0'),
      };

      const hits = parseInt(sections.stats['keyspace_hits'] || '0');
      const misses = parseInt(sections.stats['keyspace_misses'] || '0');
      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

      const operationsMetrics: RedisOperationsMetrics = {
        totalCommands: parseInt(sections.stats['total_commands_processed'] || '0'),
        opsPerSecond: parseInt(sections.stats['instantaneous_ops_per_sec'] || '0'),
        keyspaceHits: hits,
        keyspaceMisses: misses,
        hitRate,
      };

      return {
        memory: memoryMetrics,
        connection: connectionMetrics,
        operations: operationsMetrics,
        timestamp: new Date(),
      };
    } catch (error) {
      throw wrapError(error, 'Failed to parse Redis metrics', {
        service: this.constructor.name,
        operation: 'parseMetrics',
      });
    }
  }

  private parseInfo(info: string): Record<string, Record<string, string>> {
    try {
      const sections: Record<string, Record<string, string>> = {};
      let currentSection = '';

      info.split('\n').forEach((line) => {
        line = line.trim();
        if (!line || line.startsWith('#')) {
          if (line.startsWith('#')) {
            currentSection = line.substring(2).toLowerCase().trim();
            sections[currentSection] = {};
          }
        } else if (line.includes(':')) {
          const [key, value] = line.split(':');
          if (currentSection && key) {
            sections[currentSection][key.trim()] = value.trim();
          }
        }
      });

      return sections;
    } catch (error) {
      throw wrapError(error, 'Failed to parse Redis INFO command output', {
        service: this.constructor.name,
        operation: 'parseInfo',
      });
    }
  }
}


