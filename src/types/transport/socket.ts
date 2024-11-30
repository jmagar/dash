/**
 * Socket.io event type definitions
 */

import type { Host } from '../models/host';
import type { Process } from '../models/process';
import type { SystemMetrics } from '../models/metrics';

// Host Events
export interface HostConnectedEvent {
  hostId: string;
  timestamp: string;
}

export interface HostDisconnectedEvent {
  hostId: string;
  timestamp: string;
  reason?: string;
}

export interface HostMetricsEvent {
  hostId: string;
  metrics: SystemMetrics;
}

export interface HostStatusEvent {
  hostId: string;
  status: Host['status'];
  timestamp: string;
}

// Process Events
export interface ProcessStartedEvent {
  hostId: string;
  processId: string;
  pid: number;
  timestamp: string;
}

export interface ProcessStoppedEvent {
  hostId: string;
  processId: string;
  exitCode: number;
  timestamp: string;
}

export interface ProcessOutputEvent {
  hostId: string;
  processId: string;
  output: string;
  timestamp: string;
  stream: 'stdout' | 'stderr';
}

export interface ProcessErrorEvent {
  hostId: string;
  processId: string;
  error: string;
  timestamp: string;
}

// Client Events
export interface ClientCommand {
  commandId: string;
  hostId: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface ClientSubscription {
  hostId: string;
  events: string[];
}

// Server Events
export interface ServerAck {
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ServerError {
  code: string;
  message: string;
  timestamp: string;
}
