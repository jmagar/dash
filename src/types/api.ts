export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  status: string;
  os?: string;
  memory?: {
    total: number;
    used: number;
    free: number;
  };
  cpu?: {
    model: string;
    cores: number;
    usage: number;
  };
  disk?: {
    total: number;
    used: number;
    free: number;
  };
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}
