export type FileSystemType = 'sftp' | 'smb' | 'webdav' | 'rclone';

export interface FileSystemLocation {
  id: string;
  name: string;
  type: FileSystemType;
  config: {
    host?: string;
    share?: string;
    baseUrl?: string;
    remoteName?: string;
  };
  connected: boolean;
  lastAccessed?: string;
}

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

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: string;
  permissions?: string;
}

export interface FileListResponse {
  path: string;
  files: FileItem[];
  breadcrumbs: { name: string; path: string; }[];
}

export interface CopyMoveRequest {
  sourcePath: string;
  targetLocationId: string;
  targetPath: string;
  recursive?: boolean;
}

export interface Space {
  id: string;
  name: string;
  items: SpaceItem[];
  created: string;
  modified: string;
}

export interface SpaceItem {
  locationId: string;
  path: string;
  type: 'file' | 'directory';
  name: string;
}

export interface CreateSpaceRequest {
  name: string;
  items: {
    locationId: string;
    path: string;
  }[];
}

export interface QuickAccessResponse {
  favorites: SpaceItem[];
  recent: {
    item: SpaceItem;
    accessTime: string;
  }[];
}

export interface SelectRequest {
  type: 'file' | 'directory';
  multiple?: boolean;
  filter?: {
    extensions?: string[];
    mimeTypes?: string[];
  };
}

export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted';
  locationId: string;
  path: string;
  item?: FileItem;
}

export interface TransferProgressEvent {
  operationId: string;
  type: 'copy' | 'move' | 'upload' | 'download';
  progress: number;
  speed: number;
  remaining: number;
}

export interface FileSystemStats {
  size: number;
  mtime: number;  // Unix timestamp in seconds
  mode: number;   // Unix file mode (permissions)
  modTime: number; // Unix timestamp in milliseconds
  owner: string;  // Owner username/ID
  group: string;  // Group name/ID
  isDirectory: boolean;
  isFile: boolean;
  permissions: string; // String representation of permissions (e.g. '644')
}
