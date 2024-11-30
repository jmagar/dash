import { FileItem } from '../../../types/filesystem';

export { FileItem };

export type FileSystemType = 'sftp' | 'smb' | 'webdav' | 'rclone';

export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface SmbConfig {
  host: string;
  share: string;
  username: string;
  password: string;
  domain?: string;
}

export interface WebdavConfig {
  url: string;
  username: string;
  password: string;
}

export interface RcloneConfig {
  remote: string;
  configPath: string;
}

export interface FilesystemLocation {
  id: string;
  type: FileSystemType;
  credentials: FileSystemCredentials;
  path?: string;
}

export interface FileSystemCredentials {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  url?: string;
  share?: string;
  domain?: string;
  remote?: string;
  configPath?: string;
}

export interface FileSystemStats {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
  mtime?: Date;
  atime?: Date;
  ctime?: Date;
  birthtime?: Date;
}

export interface FileSystemProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  list(path: string): Promise<string[]>;
  stat(path: string): Promise<FileSystemStats>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
}
