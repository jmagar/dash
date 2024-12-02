import { BaseEntity } from './base';
import { ServiceStatus } from './status';

export interface Process extends BaseEntity {
  hostId: string;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  pid?: number;
  status: ServiceStatus;
  startTime?: Date;
  stopTime?: Date;
  exitCode?: number;
  metrics?: ProcessMetrics;
  config?: ProcessConfig;
  env?: Record<string, string>;
}

export interface ProcessMetrics {
  cpu: {
    usage: number;
    system: number;
    user: number;
  };
  memory: {
    usage: number;
    virtual: number;
    resident: number;
  };
  io: {
    read: number;
    write: number;
  };
  network: {
    rx_bytes: number;
    tx_bytes: number;
    rx_packets: number;
    tx_packets: number;
  };
}

export interface ProcessConfig {
  autostart?: boolean;
  autorestart?: boolean;
  maxRetries?: number;
  stopTimeout?: number;
  env?: Record<string, string>;
}

// Type guards
export function isProcess(obj: unknown): obj is Process {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hostId' in obj &&
    'name' in obj &&
    'command' in obj &&
    'args' in obj &&
    'cwd' in obj &&
    'status' in obj
  );
}

export function isProcessMetrics(obj: unknown): obj is ProcessMetrics {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'cpu' in obj &&
    'memory' in obj &&
    'io' in obj &&
    'network' in obj
  );
}
