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

export interface HostUpdate extends Partial<Host> {
  metadata?: Record<string, unknown>;
}

// Type guards
export function isHost(obj: unknown): obj is Host {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'hostname' in obj &&
    'status' in obj;
}

export function isHostGroup(obj: unknown): obj is HostGroup {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'hosts' in obj &&
    Array.isArray((obj as HostGroup).hosts);
}
