import { EventEmitter } from 'events';
import { 
  ServiceStatus, 
  StatusChangeEvent,
  Status 
} from '../types/status';
import { 
  validateServiceStatus, 
  validateStatusTransition,
  defaultServiceTransitions 
} from '../utils/status-validator';

export interface ServiceConfig {
  name: string;
  version: string;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface ServiceEvents {
  'status:change': (event: StatusChangeEvent<ServiceStatus>) => void;
  'error': (error: Error) => void;
  'ready': () => void;
  'shutdown': () => void;
}

/**
 * Base service class that implements status management and lifecycle events
 */
export abstract class BaseService extends EventEmitter {
  protected status: ServiceStatus;
  protected readonly config: ServiceConfig;
  private readonly startTime: Date;

  constructor(config: ServiceConfig) {
    super();
    this.config = config;
    this.status = ServiceStatus.INACTIVE;
    this.startTime = new Date();

    // Bind methods
    this.setStatus = this.setStatus.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.validateStatus = this.validateStatus.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
  }

  /**
   * Get the current service status
   */
  public getStatus(): ServiceStatus {
    return this.status;
  }

  /**
   * Set the service status with validation
   */
  protected setStatus(newStatus: ServiceStatus): boolean {
    const validation = validateStatusTransition(
      this.status,
      newStatus,
      defaultServiceTransitions
    );

    if (!validation.canTransition) {
      this.emit('error', new Error(validation.message));
      return false;
    }

    const previousStatus = this.status;
    this.status = newStatus;

    const event: StatusChangeEvent<ServiceStatus> = {
      previousStatus,
      currentStatus: newStatus,
      timestamp: new Date(),
      metadata: {
        serviceName: this.config.name,
        uptime: Date.now() - this.startTime.getTime()
      }
    };

    this.emit('status:change', event);
    return true;
  }

  /**
   * Validate the current service status
   */
  protected validateStatus(): boolean {
    const validation = validateServiceStatus(this.status);
    if (!validation.isValid) {
      this.emit('error', new Error(validation.message));
      return false;
    }
    return true;
  }

  /**
   * Start the service
   */
  public async start(): Promise<void> {
    if (this.status !== ServiceStatus.INACTIVE) {
      throw new Error(`Cannot start service in ${this.status} status`);
    }

    try {
      this.setStatus(ServiceStatus.STARTING);
      await this.onStart();
      this.setStatus(ServiceStatus.ACTIVE);
      this.emit('ready');
    } catch (error) {
      this.setStatus(ServiceStatus.ERROR);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop the service
   */
  public async stop(): Promise<void> {
    if (this.status === ServiceStatus.INACTIVE) {
      return;
    }

    try {
      this.setStatus(ServiceStatus.STOPPING);
      await this.onStop();
      this.setStatus(ServiceStatus.INACTIVE);
      this.emit('shutdown');
    } catch (error) {
      this.setStatus(ServiceStatus.ERROR);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Service-specific start logic
   */
  protected abstract onStart(): Promise<void>;

  /**
   * Service-specific stop logic
   */
  protected abstract onStop(): Promise<void>;
}
