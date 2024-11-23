import { FileItem } from '../../../types/models-shared';

export type FileSystemType = 'sftp' | 'smb' | 'rclone' | 'webdav';

export interface FileSystemCredentials {
  type: FileSystemType;
  // Common credentials
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  
  // SFTP specific
  privateKey?: string;
  
  // SMB specific
  domain?: string;
  share?: string;
  
  // WebDAV specific
  baseUrl?: string;
  digest?: boolean;
  
  // Rclone specific
  rcloneConfig?: string;
  remoteName?: string;
}

export interface FileSystemStats {
  size: number;
  mtime: number;
  mode: number;
  modTime: number;
  owner: string;
  group: string;
  isDirectory: boolean;
  isFile: boolean;
  permissions?: string;
}

export interface FileSystemProvider {
  readonly type: FileSystemType;
  
  connect(credentials: FileSystemCredentials): Promise<void>;
  disconnect(): Promise<void>;
  
  // Core file operations
  listFiles(path: string): Promise<FileItem[]>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, content: Buffer): Promise<void>;
  delete(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  stat(path: string): Promise<FileSystemStats>;
  
  // Optional capabilities - providers can implement these if supported
  exists?(path: string): Promise<boolean>;
  test?(): Promise<boolean>; // Test connection/credentials
}
