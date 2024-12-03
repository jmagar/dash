import { RedisClientType } from 'redis';
import { CACHE_KEYS, CACHE_TTL } from './keys';
import { FileSystemState, ProcessState, NetworkState, UserState, AppState, SystemState } from '../../types/chatbot';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { metrics } from '../metrics';
import { errorAggregator } from '../services/errorAggregator';
import { RedisError, RedisErrorCode } from '../../types/redis';
import { getErrorMessage, wrapError } from './utils/error';

export class ContextCache {
  constructor(private readonly redis: RedisClientType) {}

  private async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      metrics.increment('cache.operation.success');
      metrics.timing('cache.operation.duration', Date.now() - startTime);
      return result;
    } catch (error) {
      metrics.increment('cache.operation.error');
      const redisError = wrapError(error, 'Cache operation failed', {
        service: this.constructor.name,
        ...context,
        duration: Date.now() - startTime
      });

      LoggingManager.getInstance().error('Cache operation failed', { error: redisError.toJSON() });
      errorAggregator.trackError(redisError, redisError.metadata);

      throw redisError;
    }
  }

  private async setCache<T>(key: string, value: T, ttl: number, context: Record<string, unknown> = {}): Promise<void> {
    await this.withErrorHandling(async () => {
      await this.redis.setEx(key, ttl, JSON.stringify(value));
    }, { operation: 'setCache', key, ttl, ...context });
  }

  private async getCache<T>(key: string, context: Record<string, unknown> = {}): Promise<T | null> {
    return this.withErrorHandling(async () => {
      const value = await this.redis.get(key);
      if (!value) {
        metrics.increment('cache.miss');
        return null;
      }
      metrics.increment('cache.hit');
      return JSON.parse(value) as T;
    }, { operation: 'getCache', key, ...context });
  }

  // File System Cache
  async cacheFileSystemState(state: FileSystemState): Promise<void> {
    await Promise.all([
      this.setCache(CACHE_KEYS.FILESYSTEM.EVENTS, state.events, CACHE_TTL.FILESYSTEM.EVENTS, { type: 'filesystem_events' }),
      this.setCache(CACHE_KEYS.FILESYSTEM.WATCHERS, state.watchers, CACHE_TTL.FILESYSTEM.WATCHERS, { type: 'filesystem_watchers' }),
      this.setCache(CACHE_KEYS.FILESYSTEM.USAGE, state.usage, CACHE_TTL.FILESYSTEM.USAGE, { type: 'filesystem_usage' }),
      this.setCache(CACHE_KEYS.FILESYSTEM.RECENT, state.recentFiles, CACHE_TTL.FILESYSTEM.RECENT, { type: 'filesystem_recent' })
    ]);
  }

  async getFileSystemState(): Promise<Partial<FileSystemState>> {
    const [events, watchers, usage, recentFiles] = await Promise.all([
      this.getCache<FileSystemState['events']>(CACHE_KEYS.FILESYSTEM.EVENTS, { type: 'filesystem_events' }),
      this.getCache<FileSystemState['watchers']>(CACHE_KEYS.FILESYSTEM.WATCHERS, { type: 'filesystem_watchers' }),
      this.getCache<FileSystemState['usage']>(CACHE_KEYS.FILESYSTEM.USAGE, { type: 'filesystem_usage' }),
      this.getCache<FileSystemState['recentFiles']>(CACHE_KEYS.FILESYSTEM.RECENT, { type: 'filesystem_recent' })
    ]);

    return {
      events: events ?? [],
      watchers: watchers ?? [],
      usage: usage ?? null,
      recentFiles: recentFiles ?? []
    };
  }

  // Process Cache
  async cacheProcessState(state: ProcessState): Promise<void> {
    await Promise.all([
      this.setCache(CACHE_KEYS.PROCESS.METRICS, state.metrics, CACHE_TTL.PROCESS.METRICS, { type: 'process_metrics' }),
      this.setCache(CACHE_KEYS.PROCESS.RESOURCES, state.resources, CACHE_TTL.PROCESS.RESOURCES, { type: 'process_resources' }),
      this.setCache(CACHE_KEYS.PROCESS.SERVICES, state.services, CACHE_TTL.PROCESS.SERVICES, { type: 'process_services' })
    ]);
  }

  async getProcessState(): Promise<Partial<ProcessState>> {
    const [metrics, resources, services] = await Promise.all([
      this.getCache<ProcessState['metrics']>(CACHE_KEYS.PROCESS.METRICS, { type: 'process_metrics' }),
      this.getCache<ProcessState['resources']>(CACHE_KEYS.PROCESS.RESOURCES, { type: 'process_resources' }),
      this.getCache<ProcessState['services']>(CACHE_KEYS.PROCESS.SERVICES, { type: 'process_services' })
    ]);

    return {
      metrics: metrics ?? null,
      resources: resources ?? null,
      services: services ?? []
    };
  }

  // Network Cache
  async cacheNetworkState(state: NetworkState): Promise<void> {
    await Promise.all([
      this.setCache(CACHE_KEYS.NETWORK.METRICS, state.metrics, CACHE_TTL.NETWORK.METRICS, { type: 'network_metrics' }),
      this.setCache(CACHE_KEYS.NETWORK.CONNECTIONS, state.connections, CACHE_TTL.NETWORK.CONNECTIONS, { type: 'network_connections' }),
      this.setCache(CACHE_KEYS.NETWORK.INTERFACES, state.interfaces, CACHE_TTL.NETWORK.INTERFACES, { type: 'network_interfaces' }),
      this.setCache(CACHE_KEYS.NETWORK.SSH, state.sshConnections, CACHE_TTL.NETWORK.SSH, { type: 'network_ssh' })
    ]);
  }

  async getNetworkState(): Promise<Partial<NetworkState>> {
    const [metrics, connections, interfaces, ssh] = await Promise.all([
      this.getCache<NetworkState['metrics']>(CACHE_KEYS.NETWORK.METRICS, { type: 'network_metrics' }),
      this.getCache<NetworkState['connections']>(CACHE_KEYS.NETWORK.CONNECTIONS, { type: 'network_connections' }),
      this.getCache<NetworkState['interfaces']>(CACHE_KEYS.NETWORK.INTERFACES, { type: 'network_interfaces' }),
      this.getCache<NetworkState['sshConnections']>(CACHE_KEYS.NETWORK.SSH, { type: 'network_ssh' })
    ]);

    return {
      metrics: metrics ?? null,
      connections: connections ?? [],
      interfaces: interfaces ?? [],
      sshConnections: ssh ?? []
    };
  }

  // User Cache
  async cacheUserState(state: UserState): Promise<void> {
    await Promise.all([
      this.setCache(CACHE_KEYS.USER.ACTIVITY, state.activity, CACHE_TTL.USER.ACTIVITY, { type: 'user_activity' }),
      this.setCache(CACHE_KEYS.USER.PREFERENCES, state.preferences, CACHE_TTL.USER.PREFERENCES, { type: 'user_preferences' }),
      this.setCache(CACHE_KEYS.USER.WORKFLOWS, state.workflows, CACHE_TTL.USER.WORKFLOWS, { type: 'user_workflows' }),
      this.setCache(CACHE_KEYS.USER.ERRORS, state.errors, CACHE_TTL.USER.ERRORS, { type: 'user_errors' })
    ]);
  }

  async getUserState(): Promise<Partial<UserState>> {
    const [activity, preferences, workflows, errors] = await Promise.all([
      this.getCache<UserState['activity']>(CACHE_KEYS.USER.ACTIVITY, { type: 'user_activity' }),
      this.getCache<UserState['preferences']>(CACHE_KEYS.USER.PREFERENCES, { type: 'user_preferences' }),
      this.getCache<UserState['workflows']>(CACHE_KEYS.USER.WORKFLOWS, { type: 'user_workflows' }),
      this.getCache<UserState['errors']>(CACHE_KEYS.USER.ERRORS, { type: 'user_errors' })
    ]);

    return {
      activity: activity ?? [],
      preferences: preferences ?? {},
      workflows: workflows ?? [],
      errors: errors ?? []
    };
  }

  // App Cache
  async cacheAppState(state: AppState): Promise<void> {
    await Promise.all([
      this.setCache(CACHE_KEYS.APP.METRICS, state.metrics, CACHE_TTL.APP.METRICS, { type: 'app_metrics' }),
      this.setCache(CACHE_KEYS.APP.HEALTH, state.health, CACHE_TTL.APP.HEALTH, { type: 'app_health' }),
      this.setCache(CACHE_KEYS.APP.FEATURES, state.features, CACHE_TTL.APP.FEATURES, { type: 'app_features' }),
      this.setCache(CACHE_KEYS.APP.ERRORS, state.errors, CACHE_TTL.APP.ERRORS, { type: 'app_errors' })
    ]);
  }

  async getAppState(): Promise<Partial<AppState>> {
    const [metrics, health, features, errors] = await Promise.all([
      this.getCache<AppState['metrics']>(CACHE_KEYS.APP.METRICS, { type: 'app_metrics' }),
      this.getCache<AppState['health']>(CACHE_KEYS.APP.HEALTH, { type: 'app_health' }),
      this.getCache<AppState['features']>(CACHE_KEYS.APP.FEATURES, { type: 'app_features' }),
      this.getCache<AppState['errors']>(CACHE_KEYS.APP.ERRORS, { type: 'app_errors' })
    ]);

    return {
      metrics: metrics ?? null,
      health: health ?? null,
      features: features ?? [],
      errors: errors ?? []
    };
  }

  // System Cache
  async cacheSystemState(state: SystemState): Promise<void> {
    await Promise.all([
      this.setCache(CACHE_KEYS.SYSTEM.EVENTS, state.events, CACHE_TTL.SYSTEM.EVENTS, { type: 'system_events' }),
      this.setCache(CACHE_KEYS.SYSTEM.ALERTS, state.alerts, CACHE_TTL.SYSTEM.ALERTS, { type: 'system_alerts' }),
      this.setCache(CACHE_KEYS.SYSTEM.DEPENDENCIES, state.dependencies, CACHE_TTL.SYSTEM.DEPENDENCIES, { type: 'system_dependencies' })
    ]);
  }

  async getSystemState(): Promise<Partial<SystemState>> {
    const [events, alerts, dependencies] = await Promise.all([
      this.getCache<SystemState['events']>(CACHE_KEYS.SYSTEM.EVENTS, { type: 'system_events' }),
      this.getCache<SystemState['alerts']>(CACHE_KEYS.SYSTEM.ALERTS, { type: 'system_alerts' }),
      this.getCache<SystemState['dependencies']>(CACHE_KEYS.SYSTEM.DEPENDENCIES, { type: 'system_dependencies' })
    ]);

    return {
      events: events ?? [],
      alerts: alerts ?? [],
      dependencies: dependencies ?? []
    };
  }
}

