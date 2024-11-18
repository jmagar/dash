export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  environment?: string;
  tags?: string[];
  status: 'online' | 'offline' | 'error';
  lastSeen?: Date;
  agentStatus?: 'installed' | 'error' | null;
  agentVersion?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface HostGroup {
  id: string;
  name: string;
  description?: string;
  hosts: Host[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface HostStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  byOs: {
    [key: string]: number;
  };
  byStatus: {
    [key: string]: number;
  };
  byFeature: {
    [key: string]: number;
  };
}

export interface HostFilter {
  search?: string;
  status?: Host['status'][];
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
  name?: string;
  hostname?: string;
  port?: number;
  username?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
