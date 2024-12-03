import type { LogMetadata } from '../../types/logger';
import type { RedisConfig } from '../../types/redis';
import { CommandCacheService } from './CommandCacheService';
import { ContextCacheService } from './ContextCacheService';
import { DockerCacheService } from './DockerCacheService';
import { HostCacheService } from './HostCacheService';
import { SessionCacheService } from './SessionCacheService';
import { SystemCacheService } from './SystemCacheService';
import { LoggingManager } from '../utils/logging/LoggingManager';
import type { Container, Stack } from '../../types/models-shared';
import type { SessionData } from '../../types/session';
import type { 
  FileSystemState,
  ProcessState,
  NetworkState,
  UserState,
  AppState,
  SystemState
} from '../../types/system';
import { getErrorMessage, maskSensitiveData } from './utils/error';

/**
 * Main cache service that coordinates all specialized cache services
 */
export class CacheService {
  private readonly _commandCache: CommandCacheService;
  private readonly _contextCache: ContextCacheService;
  private readonly _dockerCache: DockerCacheService;
  private readonly _hostCache: HostCacheService;
  private readonly _sessionCache: SessionCacheService;
  private readonly _systemCache: SystemCacheService;

  constructor(config: RedisConfig) {
    this._commandCache = new CommandCacheService(config);
    this._contextCache = new ContextCacheService(config);
    this._dockerCache = new DockerCacheService(config);
    this._hostCache = new HostCacheService(config);
    this._sessionCache = new SessionCacheService(config);
    this._systemCache = new SystemCacheService(config);
  }

  // Session Management
  public async getSession(token: string): Promise<SessionData | null> {
    try {
      return await this._sessionCache.get(token);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        token: this.maskToken(token)
      };
      LoggingManager.getInstance().error('Failed to get session', metadata);
      throw error;
    }
  }

  public async setSession(token: string, data: SessionData): Promise<void> {
    try {
      await this._sessionCache.set(token, data);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        token: this.maskToken(token)
      };
      LoggingManager.getInstance().error('Failed to set session', metadata);
      throw error;
    }
  }

  public async deleteSession(token: string): Promise<void> {
    try {
      await this._sessionCache.delete(token);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        token: this.maskToken(token)
      };
      LoggingManager.getInstance().error('Failed to delete session', metadata);
      throw error;
    }
  }

  // Docker Management
  public async getContainers(hostId: string): Promise<Container[] | null> {
    try {
      return await this._dockerCache.getContainers(hostId);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to get containers', metadata);
      throw error;
    }
  }

  public async setContainers(hostId: string, containers: Container[]): Promise<void> {
    try {
      await this._dockerCache.setContainers(hostId, containers);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId,
        containerCount: containers.length
      };
      LoggingManager.getInstance().error('Failed to set containers', metadata);
      throw error;
    }
  }

  public async getStacks(hostId: string): Promise<Stack[] | null> {
    try {
      return await this._dockerCache.getStacks(hostId);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to get stacks', metadata);
      throw error;
    }
  }

  public async setStacks(hostId: string, stacks: Stack[]): Promise<void> {
    try {
      await this._dockerCache.setStacks(hostId, stacks);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId,
        stackCount: stacks.length
      };
      LoggingManager.getInstance().error('Failed to set stacks', metadata);
      throw error;
    }
  }

  // System State Management
  public async getFileSystemState(hostId: string): Promise<FileSystemState | null> {
    try {
      return await this._systemCache.getState<FileSystemState>(`filesystem:${hostId}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to get filesystem state', metadata);
      throw error;
    }
  }

  public async setFileSystemState(hostId: string, state: FileSystemState): Promise<void> {
    try {
      await this._systemCache.setState(`filesystem:${hostId}`, state);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to set filesystem state', metadata);
      throw error;
    }
  }

  public async getProcessState(hostId: string): Promise<ProcessState | null> {
    try {
      return await this._systemCache.getState<ProcessState>(`process:${hostId}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to get process state', metadata);
      throw error;
    }
  }

  public async setProcessState(hostId: string, state: ProcessState): Promise<void> {
    try {
      await this._systemCache.setState(`process:${hostId}`, state);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to set process state', metadata);
      throw error;
    }
  }

  public async getNetworkState(hostId: string): Promise<NetworkState | null> {
    try {
      return await this._systemCache.getState<NetworkState>(`network:${hostId}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to get network state', metadata);
      throw error;
    }
  }

  public async setNetworkState(hostId: string, state: NetworkState): Promise<void> {
    try {
      await this._systemCache.setState(`network:${hostId}`, state);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to set network state', metadata);
      throw error;
    }
  }

  public async getUserState(userId: string): Promise<UserState | null> {
    try {
      return await this._systemCache.getState<UserState>(`user:${userId}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        userId
      };
      LoggingManager.getInstance().error('Failed to get user state', metadata);
      throw error;
    }
  }

  public async setUserState(userId: string, state: UserState): Promise<void> {
    try {
      await this._systemCache.setState(`user:${userId}`, state);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        userId
      };
      LoggingManager.getInstance().error('Failed to set user state', metadata);
      throw error;
    }
  }

  public async getAppState(): Promise<AppState | null> {
    try {
      return await this._systemCache.getState<AppState>('app');
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error)
      };
      LoggingManager.getInstance().error('Failed to get app state', metadata);
      throw error;
    }
  }

  public async setAppState(state: AppState): Promise<void> {
    try {
      await this._systemCache.setState('app', state);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error)
      };
      LoggingManager.getInstance().error('Failed to set app state', metadata);
      throw error;
    }
  }

  public async getSystemState(hostId: string): Promise<SystemState | null> {
    try {
      return await this._systemCache.getState<SystemState>(`system:${hostId}`);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to get system state', metadata);
      throw error;
    }
  }

  public async setSystemState(hostId: string, state: SystemState): Promise<void> {
    try {
      await this._systemCache.setState(`system:${hostId}`, state);
    } catch (error) {
      const metadata: LogMetadata = {
        error: this.getErrorMessage(error),
        hostId
      };
      LoggingManager.getInstance().error('Failed to set system state', metadata);
      throw error;
    }
  }

  private getErrorMessage(error: unknown): string {
    return getErrorMessage(error);
  }

  private maskToken(token: string): string {
    return maskSensitiveData(token);
  }
}

