import { FileSystemType } from './filesystem';

export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  type: FileSystemType;
  agentId?: string;
  share?: string;
  domain?: string;
  rcloneConfig?: string;
  remoteName?: string;
  createdAt: Date;
  updatedAt: Date;
}
