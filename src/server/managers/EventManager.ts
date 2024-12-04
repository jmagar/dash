import { EventEmitter } from 'events';
import { ConfigManager } from './ConfigManager';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { BaseManagerDependencies } from './ManagerContainer';
import { ServiceHealth, ServiceStatus } from '../types/service.types';

// Event types
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;
export type EventName = string;

export interface EventSubscription<T = unknown> {
  event: EventName;
  handler: EventHandler<T>;
}

export interface EventMetrics {
  totalEvents: number;
  totalErrors: number;
  averageProcessingTime: number;
  activeSubscriptions: number;
}

export interface EventConfig {
  maxListeners?: number;
  enableMetrics?: boolean;
  enableLogging?: boolean;
  errorHandling?: {
    retryAttempts: number;
    retryDelay: number;
  };
}

export class EventManager {
  private static instance: EventManager;

  // Core event emitter with explicit typing
  private readonly eventEmitter: EventEmitter;

  // Dependency references
  private configManager?: ConfigManager;
  private loggingManager?: LoggingManager;
  private metricsManager?: MetricsManager;

  // Event tracking with improved type safety
  private readonly eventSubscriptions: Map<EventName, Array<EventSubscription<unknown>>>;
  private readonly eventConfig: EventConfig;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventSubscriptions = new Map();
    this.eventConfig = {
      maxListeners: 10,
      enableMetrics: true,
      enableLogging: true,
      errorHandling: {
        retryAttempts: 3,
        retryDelay: 1000
      }
    };
  }

  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  public initialize(deps: BaseManagerDependencies): void {
    this.configManager = deps.configManager;
    this.loggingManager = deps.loggingManager;
    this.metricsManager = deps.metricsManager;

    this.setupEventMetrics();
    this.configureEventEmitter();
  }

  private configureEventEmitter(): void {
    if (this.eventConfig.maxListeners) {
      this.eventEmitter.setMaxListeners(this.eventConfig.maxListeners);
    }
  }

  private setupEventMetrics(): void {
    try {
      if (this.eventConfig.enableMetrics && this.metricsManager) {
        this.metricsManager.createCounter('event_total', 'Total number of events emitted', ['event_type']);
        this.metricsManager.createCounter('event_errors_total', 'Total number of event handling errors', ['event_type', 'error_type']);
        this.metricsManager.createHistogram('event_processing_duration_seconds', 'Duration of event processing', ['event_type']);
        this.metricsManager.createGauge('event_active_subscriptions', 'Number of active event subscriptions', ['event_type']);
      }
    } catch (error) {
      const typedError = error as Error;
      this.loggingManager?.error('Failed to setup event metrics', { 
        error: typedError.message,
        stack: typedError.stack
      });
    }
  }

  public async init(): Promise<void> {
    try {
      const eventConfig = await this.configManager?.get<EventConfig>('events');
      if (eventConfig) {
        Object.assign(this.eventConfig, eventConfig);
        this.configureEventEmitter();
      }
      
      this.loggingManager?.info('Event Manager initialized', { 
        config: this.eventConfig 
      });
    } catch (error) {
      const typedError = error as Error;
      this.loggingManager?.error('Failed to initialize Event Manager', { 
        error: typedError.message,
        stack: typedError.stack
      });
      throw error;
    }
  }

  public on<T = unknown>(event: EventName, handler: EventHandler<T>): void {
    try {
      // Type-safe event handler wrapper
      const wrappedHandler = async (data: T): Promise<void> => {
        const startTime = Date.now();
        try {
          await handler(data);
          
          if (this.eventConfig.enableMetrics) {
            const duration = (Date.now() - startTime) / 1000;
            this.metricsManager?.incrementHistogram('event_processing_duration_seconds', duration, { 
              event_type: event 
            });
          }
        } catch (error) {
          const typedError = error as Error;
          this.handleEventError(event, typedError);
        }
      };

      this.eventEmitter.on(event, wrappedHandler);

      // Track subscription
      const subscriptions = this.eventSubscriptions.get(event) || [];
      subscriptions.push({ event, handler: wrappedHandler });
      this.eventSubscriptions.set(event, subscriptions);

      if (this.eventConfig.enableMetrics) {
        this.metricsManager?.incrementCounter('event_active_subscriptions', { event_type: event });
      }

      if (this.eventConfig.enableLogging) {
        this.loggingManager?.debug('Event subscription added', { event });
      }
    } catch (error) {
      const typedError = error as Error;
      this.handleEventError(event, typedError);
    }
  }

  public emit<T = unknown>(event: EventName, data: T): boolean {
    const startTime = Date.now();
    try {
      if (this.eventConfig.enableMetrics) {
        this.metricsManager?.incrementCounter('event_total', { event_type: event });
      }

      const result = this.eventEmitter.emit(event, data);

      if (this.eventConfig.enableMetrics) {
        const duration = (Date.now() - startTime) / 1000;
        this.metricsManager?.incrementHistogram('event_processing_duration_seconds', duration, { 
          event_type: event 
        });
      }

      return result;
    } catch (error) {
      const typedError = error as Error;
      this.handleEventError(event, typedError);
      return false;
    }
  }

  public once<T = unknown>(event: EventName, handler: EventHandler<T>): void {
    try {
      // Type-safe one-time event handler wrapper
      const wrappedHandler = async (data: T): Promise<void> => {
        const startTime = Date.now();
        try {
          await handler(data);
          
          if (this.eventConfig.enableMetrics) {
            const duration = (Date.now() - startTime) / 1000;
            this.metricsManager?.incrementHistogram('event_processing_duration_seconds', duration, { 
              event_type: event 
            });
          }

          // Remove the subscription after first call
          this.removeSubscription(event, wrappedHandler);
        } catch (error) {
          const typedError = error as Error;
          this.handleEventError(event, typedError);
        }
      };

      this.eventEmitter.once(event, wrappedHandler);

      // Track subscription
      const subscriptions = this.eventSubscriptions.get(event) || [];
      subscriptions.push({ event, handler: wrappedHandler });
      this.eventSubscriptions.set(event, subscriptions);

      if (this.eventConfig.enableMetrics) {
        this.metricsManager?.incrementCounter('event_active_subscriptions', { event_type: event });
      }

      if (this.eventConfig.enableLogging) {
        this.loggingManager?.debug('One-time event subscription added', { event });
      }
    } catch (error) {
      const typedError = error as Error;
      this.handleEventError(event, typedError);
    }
  }

  private handleEventError(event: EventName, error: Error): void {
    if (this.eventConfig.enableMetrics) {
      this.metricsManager?.incrementCounter('event_errors_total', { 
        event_type: event,
        error_type: error.name
      });
    }

    if (this.eventConfig.enableLogging) {
      this.loggingManager?.error('Event handling error', {
        event,
        error: error.message,
        stack: error.stack
      });
    }
  }

  public removeSubscription(event: EventName, handler: EventHandler<unknown>): void {
    try {
      this.eventEmitter.removeListener(event, handler);

      const subscriptions = this.eventSubscriptions.get(event) || [];
      const updatedSubscriptions = subscriptions.filter(sub => sub.handler !== handler);
      
      if (updatedSubscriptions.length === 0) {
        this.eventSubscriptions.delete(event);
      } else {
        this.eventSubscriptions.set(event, updatedSubscriptions);
      }

      if (this.eventConfig.enableMetrics) {
        this.metricsManager?.incrementCounter('event_active_subscriptions', { event_type: event });
      }

      if (this.eventConfig.enableLogging) {
        this.loggingManager?.debug('Event subscription removed', { event });
      }
    } catch (error) {
      const typedError = error as Error;
      this.handleEventError(event, typedError);
    }
  }

  public removeAllSubscriptions(event?: EventName): void {
    try {
      if (event) {
        this.eventEmitter.removeAllListeners(event);
        this.eventSubscriptions.delete(event);
      } else {
        this.eventEmitter.removeAllListeners();
        this.eventSubscriptions.clear();
      }

      if (this.eventConfig.enableLogging) {
        this.loggingManager?.debug('Event subscriptions cleared', { 
          event: event || 'all' 
        });
      }
    } catch (error) {
      const typedError = error as Error;
      this.handleEventError(event || 'all', typedError);
    }
  }

  public async getMetrics(): Promise<EventMetrics> {
    try {
      const totalEvents = await this.metricsManager?.getMetric('event_total')?.get() || 0;
      const totalErrors = await this.metricsManager?.getMetric('event_errors_total')?.get() || 0;
      const processingTime = await this.metricsManager?.getMetric('event_processing_duration_seconds')?.get() || 0;
      const activeSubscriptions = Array.from(this.eventSubscriptions.values()).reduce(
        (total, subs) => total + subs.length, 
        0
      );

      return {
        totalEvents,
        totalErrors,
        averageProcessingTime: processingTime,
        activeSubscriptions
      };
    } catch (error) {
      const typedError = error as Error;
      this.handleEventError('metrics', typedError);
      return {
        totalEvents: 0,
        totalErrors: 0,
        averageProcessingTime: 0,
        activeSubscriptions: 0
      };
    }
  }

  public async healthCheck(): Promise<ServiceHealth> {
    try {
      const metrics = await this.getMetrics();
      const hasErrors = metrics.totalErrors > 0;

      return {
        status: hasErrors ? ServiceStatus.DEGRADED : ServiceStatus.HEALTHY,
        version: '1.0.0',
        details: {
          metrics,
          config: this.eventConfig,
          activeEvents: Array.from(this.eventSubscriptions.keys())
        }
      };
    } catch (error) {
      const typedError = error as Error;
      this.handleEventError('health_check', typedError);
      return {
        status: ServiceStatus.ERROR,
        version: '1.0.0',
        details: {
          error: typedError.message,
          stack: typedError.stack
        }
      };
    }
  }

  public async cleanup(): Promise<void> {
    try {
      this.removeAllSubscriptions();
      
      if (this.eventConfig.enableLogging) {
        this.loggingManager?.info('Event Manager cleaned up successfully');
      }
    } catch (error) {
      const typedError = error as Error;
      this.handleEventError('cleanup', typedError);
      throw error;
    }
  }
}

export default EventManager.getInstance();
