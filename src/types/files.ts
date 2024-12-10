import { Readable, Writable } from 'stream';

export interface SFTPStats {
  mode: number;
  uid: number;
  gid: number;
  size: number;
  atime: number;
  mtime: number;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size: number;
  modified: Date;
  permissions: string;
}

export interface FileUploadRequest {
  path: string;
  content: string;
}

export interface FileListResponse {
  success: boolean;
  data?: FileItem[];
  error?: string;
}

export interface FileOperationResponse {
  success: boolean;
  error?: string;
}

export interface SFTPFile {
  filename: string;
  longname: string;
  attrs: {
    mode: number;
    uid: number;
    gid: number;
    size: number;
    atime: number;
    mtime: number;
    isDirectory(): boolean;
    isFile(): boolean;
    isSymbolicLink(): boolean;
  };
}

export interface HostConnection {
  id: string;
  hostname: string;
  port: number;
  username?: string;
  private_key?: string;
  passphrase?: string;
}

export interface SFTPError extends Error {
  code?: number;
  errno?: number;
  syscall?: string;
  path?: string;
}

export interface SFTPWrapper {
  readdir(path: string, callback: (err: Error | undefined, list: SFTPFile[]) => void): void;
  createReadStream(path: string): Readable;
  createWriteStream(path: string): Writable;
  unlink(path: string, callback: (err?: Error) => void): void;
  rmdir(path: string, callback: (err?: Error) => void): void;
}

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  permissions?: string;
  owner?: string;
  group?: string;
  isSymlink?: boolean;
  target?: string;
}

export interface DeleteRequest {
  paths: string[];
}

export interface FileOperationResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface FileUploadProgress {
  id: string;
  message: string;
  progress: number;
  completed?: boolean;
}
