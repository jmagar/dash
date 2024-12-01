import { ServiceStatus } from './status';

/**
 * Base interface for all service events
 */
export interface ServiceEvent<T = unknown> {
  id: string;
  timestamp: Date;
  serviceName: string;
  type: string;
  payload?: T;
}

/**
 * Service lifecycle events
 */
export interface ServiceLifecycleEvent extends ServiceEvent<{
  status: ServiceStatus;
  reason?: string;
}> {
  type: 'service:start' | 'service:stop' | 'service:restart';
}

/**
 * Service status change events
 */
export interface ServiceStatusEvent extends ServiceEvent<{
  previousStatus: ServiceStatus;
  currentStatus: ServiceStatus;
  reason?: string;
}> {
  type: 'service:status';
}

/**
 * Service error events
 */
export interface ServiceErrorEvent extends ServiceEvent<{
  error: Error;
  context?: Record<string, string>;
}> {
  type: 'service:error';
}

/**
 * Service health check events
 */
export interface ServiceHealthEvent extends ServiceEvent<{
  status: ServiceStatus;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    timestamp: Date;
  }>;
}> {
  type: 'service:health';
}

/**
 * Service dependency events
 */
export interface ServiceDependencyEvent extends ServiceEvent<{
  dependencyName: string;
  status: ServiceStatus;
  action: 'added' | 'removed' | 'updated';
}> {
  type: 'service:dependency';
}

/**
 * Service configuration events
 */
export interface ServiceConfigEvent extends ServiceEvent<{
  changes: Array<{
    key: string;
    previousValue: string | number | boolean | null;
    currentValue: string | number | boolean | null;
  }>;
}> {
  type: 'service:config';
}

/**
 * Service communication events
 */
export interface ServiceCommunicationEvent extends ServiceEvent<{
  targetService: string;
  operation: string;
  status: 'success' | 'failure';
  duration: number;
  error?: Error;
}> {
  type: 'service:communication';
}

/**
 * Service metric events
 */
export interface ServiceMetricEvent extends ServiceEvent<{
  metricName: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
}> {
  type: 'service:metric';
}

/**
 * Union type of all service events
 */
export type ServiceEventType =
  | ServiceLifecycleEvent
  | ServiceStatusEvent
  | ServiceErrorEvent
  | ServiceHealthEvent
  | ServiceDependencyEvent
  | ServiceConfigEvent
  | ServiceCommunicationEvent
  | ServiceMetricEvent;

/**
 * Event handler type with generic type support
 */
export type ServiceEventHandler<T extends ServiceEvent = ServiceEvent> = (
  event: T
) => void | Promise<void>;

/**
 * Event subscription options with improved type safety
 */
export interface EventSubscriptionOptions {
  serviceName?: string;
  eventTypes?: Array<ServiceEventType['type']>;
  filter?: (event: ServiceEvent) => boolean;
}
