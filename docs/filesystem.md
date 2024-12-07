# Filesystem API Documentation

## Overview
The Filesystem API provides a unified interface for managing files across different providers (SFTP, SMB, WebDAV, Rclone) and integrates deeply with other application features.

## Core Concepts

### Locations
A Location represents a filesystem provider with its configuration. Examples:
- SFTP connection to a host
- SMB share
- WebDAV server
- Rclone remote

### Spaces
A Space is a virtual collection of files/folders from multiple locations. It allows users to:
- Group related files from different sources
- Create shortcuts to frequently accessed locations
- Share access to specific files/folders

## API Endpoints

### Locations

#### GET /api/fs/locations
List all configured filesystem locations.

Response:
```typescript
interface LocationResponse {
  id: string;
  name: string;
  type: 'sftp' | 'smb' | 'webdav' | 'rclone';
  config: {
    host?: string;
    share?: string;
    baseUrl?: string;
    remoteName?: string;
  };
  connected: boolean;
  lastAccessed?: string;
}
```

#### POST /api/fs/locations
Create a new filesystem location.

Request:
```typescript
interface CreateLocationRequest {
  name: string;
  type: 'sftp' | 'smb' | 'webdav' | 'rclone';
  credentials: FileSystemCredentials;
}
```

#### DELETE /api/fs/locations/:id
Remove a filesystem location.

### File Operations

#### GET /api/fs/:locationId/files
List files in a directory.

Query Parameters:
- path: string (URL encoded path)
- showHidden: boolean

Response:
```typescript
interface FileListResponse {
  path: string;
  files: FileItem[];
  breadcrumbs: { name: string; path: string; }[];
}
```

#### GET /api/fs/:locationId/files/download
Download a file.

Query Parameters:
- path: string (URL encoded path)

#### POST /api/fs/:locationId/files/upload
Upload file(s).

Request: multipart/form-data
- files: File[]
- path: string (target directory)

#### POST /api/fs/:locationId/files/copy
Copy files/directories.

Request:
```typescript
interface CopyRequest {
  sourcePath: string;
  targetLocationId: string;
  targetPath: string;
  recursive?: boolean;
}
```

#### POST /api/fs/:locationId/files/move
Move files/directories.

Request: Same as CopyRequest

### Spaces

#### GET /api/fs/spaces
List all spaces.

Response:
```typescript
interface Space {
  id: string;
  name: string;
  items: SpaceItem[];
  created: string;
  modified: string;
}

interface SpaceItem {
  locationId: string;
  path: string;
  type: 'file' | 'directory';
  name: string;
}
```

#### POST /api/fs/spaces
Create a new space.

Request:
```typescript
interface CreateSpaceRequest {
  name: string;
  items: {
    locationId: string;
    path: string;
  }[];
}
```

### Integration Endpoints

#### GET /api/fs/quick-access
Get quick access locations and recent files.

Response:
```typescript
interface QuickAccessResponse {
  favorites: SpaceItem[];
  recent: {
    item: SpaceItem;
    accessTime: string;
  }[];
}
```

#### POST /api/fs/select
Open file selector dialog (used by other components).

Request:
```typescript
interface SelectRequest {
  type: 'file' | 'directory';
  multiple?: boolean;
  filter?: {
    extensions?: string[];
    mimeTypes?: string[];
  };
}
```

## WebSocket Events

### File Changes
```typescript
interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted';
  locationId: string;
  path: string;
  item?: FileItem;
}
```

### Transfer Progress
```typescript
interface TransferProgressEvent {
  operationId: string;
  type: 'copy' | 'move' | 'upload' | 'download';
  progress: number;
  speed: number;
  remaining: number;
}
```
