import type { Host } from './models-shared';

export interface ExtendedHost extends Host {
  os_type: 'windows' | 'linux';
  labels?: Record<string, string>;
  agent_installed?: boolean;
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
}

export interface WindowsServiceConfig {
  Name: string;
  DisplayName: string;
  Description: string;
  BinaryPathName: string;
  StartupType: string;
}
