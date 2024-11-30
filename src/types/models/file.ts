/**
 * File system model type definitions
 */

export interface FileStats {
  size: number;
  accessed: string;
  modified: string;
  created: string;
  mode: number;
  uid?: number;
  gid?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  isSymlink?: boolean;
  stats?: FileStats;
  type?: string;
  extension?: string;
}

export interface FileOperation {
  id: string;
  type: 'copy' | 'move' | 'delete' | 'compress' | 'extract';
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  source: string | string[];
  destination?: string;
  error?: string;
  startTime: string;
  endTime?: string;
}

export interface FileSystemQuota {
  path: string;
  total: number;
  used: number;
  available: number;
  mountPoint: string;
  fileSystem: string;
}
