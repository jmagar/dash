import { ServiceConfig } from './service-config';
import { BaseEntity } from './base';
import { ServiceStatus } from './status';
import { Host } from './models-shared';

export interface AgentEntity extends BaseEntity {
  hostId: string;
  status: ServiceStatus;
  version: string;
  lastSeen?: Date;
  config: AgentConfig;
  metadata: AgentMetadata;
}

export interface AgentMetadata extends BaseEntity {
  os_type: 'windows' | 'linux' | 'darwin';
  labels?: Record<string, string>;
  environment?: string;
  tags?: string[];
}

export interface AgentConfig {
  server_url: string;
  agent_id: string;
  labels?: Record<string, string>;
}

export interface InstallOptions {
  installInContainer?: boolean;
  containerName?: string;
  useHostNetwork?: boolean;
  mountHostPaths?: boolean;
  labels?: Record<string, string>;
}

export interface WindowsServiceConfig {
  Name: string;
  DisplayName: string;
  Description: string;
  BinaryPathName: string;
  StartupType: string;
}

// Type guards
export function isAgentEntity(obj: unknown): obj is AgentEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hostId' in obj &&
    'status' in obj &&
    'version' in obj &&
    'config' in obj &&
    'metadata' in obj
  );
}

export function isAgentMetadata(obj: unknown): obj is AgentMetadata {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'os_type' in obj
  );
}
