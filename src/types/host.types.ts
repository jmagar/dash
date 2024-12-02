import { BaseEntity } from './base';
import { ServiceStatus } from './status';

export interface Host extends BaseEntity {
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  environment?: string;
  tags?: string[];
  status: ServiceStatus;
  lastSeen?: Date;
  agentStatus?: ServiceStatus;
  agentVersion?: string;
  metadata?: Record<string, unknown>;
}

export interface HostGroup extends BaseEntity {
  name: string;
  description?: string;
  hosts: Host[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface HostStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  byOs: Record<string, number>;
  byStatus: Record<ServiceStatus, number>;
  byAgentStatus: Record<ServiceStatus, number>;
  byFeature: Record<string, number>;
}

export interface HostFilter {
  search?: string;
  status?: ServiceStatus[];
  agentStatus?: ServiceStatus[];
  os?: string[];
  features?: string[];
  tags?: string[];
  groupId?: string;
}

export interface HostSort {
  field: keyof Host;
  direction: 'asc' | 'desc';
}

export interface HostUpdate {
  metadata?: Record<string, unknown>;
}

// Type guards
export function isHost(obj: unknown): obj is Host {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'hostname' in obj &&
    'port' in obj &&
    'username' in obj &&
    'status' in obj
  );
}

export function isHostGroup(obj: unknown): obj is HostGroup {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'hosts' in obj
  );
}
