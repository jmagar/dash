import type { Host } from './models-shared';

export interface ExtendedHost extends Host {
  os_type: 'windows' | 'linux' | 'darwin';
  labels?: Record<string, string>;
  agent_installed?: boolean;
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
