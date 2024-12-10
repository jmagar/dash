import type { BaseEntity } from './base';

export interface Host extends BaseEntity {
  id: string;
  name: string;
  hostname: string;
  os_type: 'linux' | 'windows' | 'darwin';
  username: string;
  password?: string;
  port: number;
  status: 'online' | 'offline' | 'error' | 'installing';
  lastSeen?: Date;
  agentStatus?: 'installed' | 'error' | null;
  agentVersion?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateHostRequest {
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  os_type?: 'linux' | 'windows' | 'darwin';
  environment?: string;
  install_agent?: boolean;
}

export interface UpdateHostRequest {
  name?: string;
  hostname?: string;
  port?: number;
  username?: string;
  password?: string;
  os_type?: 'linux' | 'windows' | 'darwin';
  environment?: string;
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
  byStatus: Record<string, number>;
  byAgentStatus: Record<string, number>;
  byFeature: Record<string, number>;
}

export interface HostFilter {
  search?: string;
  status?: ('online' | 'offline' | 'error' | 'installing')[];
  agentStatus?: ('installed' | 'error' | null)[];
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
