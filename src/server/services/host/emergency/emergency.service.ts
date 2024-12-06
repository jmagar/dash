import { BaseService } from '../../base.service';
import type { Host } from '../../../../types/host';
import type { EmergencyOperations, OperationResult } from './types';
import { HostState } from './types';
import { LoggingManager } from '../../../managers/LoggingManager';
import { LoggerAdapter } from '../../../utils/logging/logger.adapter';
import type { Logger } from '../../../../types/logger';
import { HostService } from '../host.service';
import { ConnectionManager } from './ssh/connection.manager';
import { ProcessOperations } from './operations/process.operations';
import { DiskChecker } from './health/disk.checker';
import { MemoryChecker } from './health/memory.checker';
import { NetworkChecker } from './health/network.checker';

/**
 * EmergencyService provides critical operations when the agent is unavailable
 * This includes:
 * 1. Basic host health checks
 * 2. Process management
 * 3. Service restarts
 * 4. Network diagnostics
 */
export class EmergencyService extends BaseService implements EmergencyOperations {
  protected readonly logger: Logger;
  private readonly connectionManager: ConnectionManager;
  private readonly processOps: ProcessOperations;
  private readonly diskChecker: DiskChecker;
  private readonly memoryChecker: MemoryChecker;
  private readonly networkChecker: NetworkChecker;

  constructor(
    private readonly hostService: HostService,
    logManager?: LoggingManager
  ) {
    super();
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, {
      component: 'EmergencyService',
      service: 'HostManagement'
    });

    this.connectionManager = new ConnectionManager(this.logger);
    this.processOps = new ProcessOperations(this.logger);
    this.diskChecker = new DiskChecker(this.logger);
    this.memoryChecker = new MemoryChecker(this.logger);
    this.networkChecker = new NetworkChecker(this.logger);

    this.logger.info('EmergencyService initialized');
  }

  /**
   * Implements cleanup method from BaseService
   */
  async cleanup(): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({ 
      operation: 'cleanup',
      component: 'EmergencyService'
    });

    try {
      methodLogger.info('Starting cleanup');
      await this.connectionManager.cleanup();
      methodLogger.info('Cleanup completed', {
        timing: { total: Date.now() - startTime }
      });
    } catch (error) {
      methodLogger.error('Cleanup failed', {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: Date.now() - startTime }
      });
      throw error;
    }
  }

  /**
   * Restart the agent service
   */
  async restart(hostId: string): Promise<OperationResult> {
    const methodLogger = this.logger.withContext({ 
      operation: 'restart',
      hostId,
      component: 'EmergencyService'
    });

    try {
      methodLogger.info('Starting agent restart');

      const host = await this.hostService.getHost(hostId);
      if (!host) {
        methodLogger.warn('Host not found');
        return {
          success: false,
          error: new Error('Host not found'),
          state: HostState.ERROR
        };
      }

      const ssh = await this.connectionManager.getConnection(host);
      return await this.processOps.restartAgent(ssh);
    } catch (error) {
      methodLogger.error('Agent restart failed', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.ERROR
      };
    }
  }

  /**
   * Kill a specific process
   */
  async killProcess(hostId: string, pid: number): Promise<OperationResult> {
    const methodLogger = this.logger.withContext({
      operation: 'killProcess',
      hostId,
      pid,
      component: 'EmergencyService'
    });

    try {
      methodLogger.info('Starting process kill');

      const host = await this.hostService.getHost(hostId);
      if (!host) {
        methodLogger.warn('Host not found');
        return {
          success: false,
          error: new Error('Host not found'),
          state: HostState.ERROR
        };
      }

      const ssh = await this.connectionManager.getConnection(host);
      return await this.processOps.killProcess(ssh, pid);
    } catch (error) {
      methodLogger.error('Failed to kill process', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.ERROR
      };
    }
  }

  /**
   * Check if host is reachable via SSH
   */
  async checkConnectivity(hostId: string): Promise<OperationResult<boolean>> {
    const methodLogger = this.logger.withContext({
      operation: 'checkConnectivity',
      hostId,
      component: 'EmergencyService'
    });

    try {
      methodLogger.info('Starting connectivity check');

      const host = await this.hostService.getHost(hostId);
      if (!host) {
        methodLogger.warn('Host not found');
        return {
          success: false,
          error: new Error('Host not found'),
          state: HostState.ERROR
        };
      }

      const ssh = await this.connectionManager.getConnection(host);
      const connected = await this.networkChecker.checkConnectivity(ssh);

      methodLogger.info('Connectivity check completed', { connected });

      return {
        success: true,
        data: connected,
        state: connected ? HostState.ACTIVE : HostState.UNREACHABLE
      };
    } catch (error) {
      methodLogger.error('Connectivity check failed', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.UNREACHABLE
      };
    }
  }

  /**
   * Run all health checks for a host
   */
  async checkHealth(hostId: string): Promise<OperationResult> {
    const methodLogger = this.logger.withContext({
      operation: 'checkHealth',
      hostId,
      component: 'EmergencyService'
    });

    try {
      methodLogger.info('Starting health checks');

      const host = await this.hostService.getHost(hostId);
      if (!host) {
        methodLogger.warn('Host not found');
        return {
          success: false,
          error: new Error('Host not found'),
          state: HostState.ERROR
        };
      }

      const ssh = await this.connectionManager.getConnection(host);
      
      // Run all health checks
      await this.diskChecker.check(ssh);
      await this.memoryChecker.check(ssh);
      await this.networkChecker.check(ssh);

      methodLogger.info('Health checks completed successfully');

      return {
        success: true,
        state: HostState.ACTIVE
      };
    } catch (error) {
      methodLogger.error('Health checks failed', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        state: HostState.ERROR
      };
    }
  }
}
