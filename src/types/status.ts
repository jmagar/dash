/**
 * Core status types for the Dash service layer
 */

/**
 * Service operational status
 */
export enum ServiceStatus {
  ACTIVE = 'active',        // Service is running and healthy
  INACTIVE = 'inactive',    // Service is stopped
  STARTING = 'starting',    // Service is initializing
  STOPPING = 'stopping',    // Service is shutting down
  DEGRADED = 'degraded',    // Service is running with reduced functionality
  ERROR = 'error',         // Service has encountered an error
  SENT = 'sent',           // Notification has been sent successfully
  PENDING = 'pending',     // Notification is queued for delivery
  FAILED = 'failed'        // Notification delivery failed
}

/**
 * Host operational status
 * @deprecated Use HostState from host.types.ts instead
 */
export enum HostStatus {
  ONLINE = 'online',        // Host is connected and responsive
  OFFLINE = 'offline',      // Host is not connected
  INSTALLING = 'installing',// Host is being set up
  ERROR = 'error'          // Host has encountered an error
}

/**
 * Agent operational status
 * @deprecated Use AgentStatus from agent-config.ts instead
 */
export enum AgentStatus {
  UNKNOWN = 'unknown',      // Agent state is not known
  CONNECTING = 'connecting',// Agent is attempting to connect
  CONNECTED = 'connected',  // Agent is connected and active
  DISCONNECTED = 'disconnected', // Agent is not connected
  ERROR = 'error'          // Agent has encountered an error
}

/**
 * Process operational status
 */
export enum ProcessStatus {
  RUNNING = 'running',      // Process is executing
  STOPPED = 'stopped',      // Process is not running
  STARTING = 'starting',    // Process is initializing
  STOPPING = 'stopping',    // Process is shutting down
  SUSPENDED = 'suspended',  // Process is paused
  ERROR = 'error'          // Process has encountered an error
}

/**
 * Generic status type that can be used for custom status enums
 */
export type Status = ServiceStatus | HostStatus | AgentStatus | ProcessStatus;

/**
 * Status change event interface
 */
export interface StatusChangeEvent<T extends Status> {
  previousStatus: T;
  currentStatus: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Status validation result
 */
export interface StatusValidationResult {
  isValid: boolean;
  status: Status;
  message?: string;
  code?: string;
}

/**
 * Status validation function type
 */
export type StatusValidator = (status: Status) => StatusValidationResult;
