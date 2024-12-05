import { EventEmitter } from 'events';
import { LoggingManager } from '../../managers/LoggingManager';
import {
  createProcessId,
  type ProcessService,
  type ProcessMonitor,
  type ProcessMonitorFactory,
  type ProcessServiceOptions,
  type ProcessInfo,
  type ProcessId,
  type ProcessEventPayload,
  type BaseErrorPayload,
} from './types';

/**
 * Implementation of the ProcessService interface that manages process monitoring across multiple hosts.
 * 
 * Key Features:
 * - Manages multiple process monitors, one per host
 * - Enforces host monitoring limits
 * - Provides process control operations (list, kill)
 * - Emits events for process lifecycle changes
 * 
 * Error Handling:
 * - All errors are logged with context
 * - Errors are emitted as events with typed payloads
 * - Operation-specific error handling with proper context
 * 
 * Event System:
 * - processStart: Emitted when a new process is detected
 * - processEnd: Emitted when a process terminates
 * - processChange: Emitted when a process status changes
 * - error: Emitted for any operational errors
 * 
 * Logging Pattern:
 * - Uses structured logging with context
 * - Includes operation-specific metadata
 * - Proper error context in all error cases
 */
export class ProcessServiceImpl extends EventEmitter implements ProcessService {
  private monitors: Map<string, ProcessMonitor>;
  private monitorFactory: ProcessMonitorFactory;
  private options: ProcessServiceOptions;
  private logger: LoggingManager;

  constructor(options: ProcessServiceOptions) {
    super();
    this.monitors = new Map();
    this.monitorFactory = options.monitorFactory;
    this.options = options;
    this.logger = LoggingManager.getInstance();
  }

  /**
   * Start monitoring processes on a specific host.
   * 
   * @param hostId - Unique identifier for the host
   * @throws Error if maximum number of monitored hosts is reached
   * @throws Error if monitor creation or startup fails
   * 
   * Implementation Details:
   * - Checks for existing monitor to prevent duplicates
   * - Enforces maximum host limit if configured
   * - Creates and initializes a new process monitor
   * - Emits error events with proper context
   */
  async monitor(hostId: string): Promise<void> {
    if (this.monitors.has(hostId)) {
      return;
    }

    if (this.options.maxMonitoredHosts && this.monitors.size >= this.options.maxMonitoredHosts) {
      const error = new Error(`Maximum number of monitored hosts (${this.options.maxMonitoredHosts}) reached`);
      this.logger.error('Monitor limit reached', {
        error: error.message,
        hostId,
        currentCount: this.monitors.size,
        maxHosts: this.options.maxMonitoredHosts
      });
      throw error;
    }

    try {
      const monitor = this.monitorFactory.create({
        hostId,
        interval: this.options.defaultInterval,
        includeChildren: this.options.includeChildren,
        excludeSystemProcesses: this.options.excludeSystemProcesses,
        sortBy: this.options.sortBy,
        sortOrder: this.options.sortOrder,
        maxProcesses: this.options.maxProcesses,
      });

      await monitor.start();
      this.monitors.set(hostId, monitor);

      this.logger.info('Process monitoring started', {
        hostId,
        interval: this.options.defaultInterval,
        includeChildren: this.options.includeChildren,
        excludeSystemProcesses: this.options.excludeSystemProcesses
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const payload: ProcessEventPayload & BaseErrorPayload = {
        processId: createProcessId(0), // Special case for monitoring errors
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
      this.logger.error('Failed to start process monitoring', {
        error: errorMessage,
        hostId,
        interval: this.options.defaultInterval
      });
      this.emit('error', hostId, payload);
      throw error;
    }
  }

  /**
   * Stop monitoring processes on a specific host.
   * 
   * @param hostId - Unique identifier for the host
   * @throws Error if stopping the monitor fails
   * 
   * Implementation Details:
   * - Safely handles non-existent monitors
   * - Ensures proper cleanup of monitor resources
   * - Updates internal state after successful stop
   */
  async unmonitor(hostId: string): Promise<void> {
    const monitor = this.monitors.get(hostId);
    if (!monitor) {
      return;
    }

    try {
      await monitor.stop();
      this.monitors.delete(hostId);
      this.logger.info('Process monitoring stopped', {
        hostId,
        monitoredHosts: this.monitors.size
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const payload: ProcessEventPayload & BaseErrorPayload = {
        processId: createProcessId(0), // Special case for monitoring errors
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
      this.logger.error('Failed to stop process monitoring', {
        error: errorMessage,
        hostId
      });
      this.emit('error', hostId, payload);
      throw error;
    }
  }

  /**
   * Get list of all processes on a monitored host.
   * 
   * @param hostId - Unique identifier for the host
   * @returns Array of process information
   * @throws Error if host is not monitored
   * @throws Error if process list retrieval fails
   * 
   * Implementation Details:
   * - Verifies host is being monitored
   * - Returns cached process information from monitor
   * - Includes process status and resource usage
   */
  async getProcesses(hostId: string): Promise<ProcessInfo[]> {
    const monitor = this.monitors.get(hostId);
    if (!monitor) {
      const error = new Error('Host is not being monitored');
      this.logger.error('Process list request for unmonitored host', {
        error: error.message,
        hostId
      });
      throw error;
    }

    try {
      return await monitor.getProcesses();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const payload: ProcessEventPayload & BaseErrorPayload = {
        processId: createProcessId(0), // Special case for listing errors
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
      this.logger.error('Failed to get process list', {
        error: errorMessage,
        hostId
      });
      this.emit('error', hostId, payload);
      throw error;
    }
  }

  /**
   * Kill a specific process on a monitored host.
   * 
   * @param hostId - Unique identifier for the host
   * @param pid - Process ID to kill
   * @param signal - Optional signal to send (default: SIGTERM)
   * @throws Error if host is not monitored
   * @throws Error if process kill operation fails
   * 
   * Implementation Details:
   * - Verifies host is being monitored
   * - Uses monitor's kill implementation
   * - Supports custom signal specification
   * - Emits error events with process context
   */
  async killProcess(hostId: string, pid: ProcessId, signal?: NodeJS.Signals): Promise<void> {
    const monitor = this.monitors.get(hostId);
    if (!monitor) {
      const error = new Error('Host is not being monitored');
      this.logger.error('Kill process request for unmonitored host', {
        error: error.message,
        hostId,
        pid,
        signal
      });
      throw error;
    }

    try {
      await monitor.killProcess(pid, signal);
      this.logger.info('Process killed successfully', {
        hostId,
        pid,
        signal
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const payload: ProcessEventPayload & BaseErrorPayload = {
        processId: pid,
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
      this.logger.error('Failed to kill process', {
        error: errorMessage,
        hostId,
        pid,
        signal
      });
      this.emit('error', hostId, payload);
      throw error;
    }
  }

  /**
   * Get process metrics for a monitored host.
   * Currently returns the same data as getProcesses().
   */
  async getProcessMetrics(hostId: string): Promise<ProcessInfo[]> {
    return this.getProcesses(hostId);
  }

  /**
   * Get information about a specific process by its ID.
   * 
   * @param hostId - Unique identifier for the host
   * @param pid - Process ID to look up
   * @returns Process information or null if not found
   * @throws Error if host is not monitored
   */
  async getProcessById(hostId: string, pid: ProcessId): Promise<ProcessInfo | null> {
    const processes = await this.getProcesses(hostId);
    return processes.find(p => p.pid === pid) || null;
  }

  /**
   * Check if a host is currently being monitored.
   */
  isMonitored(hostId: string): boolean {
    return this.monitors.has(hostId);
  }

  /**
   * Get list of all currently monitored host IDs.
   */
  getMonitoredHosts(): string[] {
    return Array.from(this.monitors.keys());
  }

  // Event handler registration methods
  onProcessStart(callback: (hostId: string, process: ProcessInfo) => void): void {
    this.on('processStart', callback);
  }

  onProcessEnd(callback: (hostId: string, process: ProcessInfo) => void): void {
    this.on('processEnd', callback);
  }

  onProcessChange(callback: (hostId: string, process: ProcessInfo, oldStatus: string) => void): void {
    this.on('processChange', callback);
  }

  onError(callback: (hostId: string, payload: ProcessEventPayload & BaseErrorPayload) => void): void {
    this.on('error', callback);
  }

  /**
   * Stop all monitoring and cleanup resources.
   * 
   * Implementation Details:
   * - Stops all active monitors
   * - Removes all event listeners
   * - Logs final state for debugging
   */
  async stop(): Promise<void> {
    const hosts = this.getMonitoredHosts();
    await Promise.all(hosts.map(hostId => this.unmonitor(hostId)));
    this.removeAllListeners();
    this.logger.info('Process service stopped', {
      monitoredHosts: hosts.length
    });
  }
}
