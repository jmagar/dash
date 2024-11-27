import { BaseApiClient, type Endpoint, type EndpointFunction } from './base.client';
import {
  FileSystemLocation,
  FileSystemCredentials,
  FileListResponse,
  CopyMoveRequest,
  Space,
  CreateSpaceRequest,
  QuickAccessResponse,
  SelectRequest,
  FileItem,
  FileChangeEvent,
  TransferProgressEvent
} from '../../types/filesystem';
import { Socket } from 'socket.io-client';

export class FilesystemClient extends BaseApiClient<Record<string, Endpoint>> {
  private static instance: FilesystemClient;

  private constructor() {
    const endpoints: Record<string, Endpoint> = {
      LOCATIONS: '/api/fs/locations',
      LOCATION_BY_ID: (id: string) => `/api/fs/locations/${id}`,
      FILES: (locationId: string) => `/api/fs/${locationId}/files`,
      FILE_BY_PATH: (locationId: string, path: string) => `/api/fs/${locationId}/files/${encodeURIComponent(path)}`,
      COPY: (locationId: string) => `/api/fs/${locationId}/files/copy`,
      MOVE: (locationId: string) => `/api/fs/${locationId}/files/move`,
      DELETE: (locationId: string, path: string) => `/api/fs/${locationId}/files/delete/${encodeURIComponent(path)}`,
      SPACES: '/api/fs/spaces',
      SPACE_BY_ID: (id: string) => `/api/fs/spaces/${id}`,
      QUICK_ACCESS: '/api/fs/quick-access',
      SELECT: '/api/fs/select',
      UPLOAD: (locationId: string) => `/api/fs/${locationId}/files/upload`,
      DOWNLOAD: (locationId: string, path: string) => `/api/fs/${locationId}/files/download/${encodeURIComponent(path)}`,
      MKDIR: (locationId: string) => `/api/fs/${locationId}/files/mkdir`,
      FAVORITES: '/api/fs/quick-access/favorites',
      TRANSFER_PROGRESS: (operationId: string) => `fs:transfer:${operationId}`,
      FILE_CHANGES: (locationId: string, path: string) => `fs:changes:${locationId}:${path}`,
    };
    super(endpoints);
  }

  static getInstance(): FilesystemClient {
    if (!FilesystemClient.instance) {
      FilesystemClient.instance = new FilesystemClient();
    }
    return FilesystemClient.instance;
  }

  // Location Management
  async listLocations(): Promise<FileSystemLocation[]> {
    const response = await this.get<FileSystemLocation[]>(this.getEndpoint('LOCATIONS'));
    return response.data || [];
  }

  async createLocation(
    name: string,
    type: string,
    credentials: FileSystemCredentials
  ): Promise<FileSystemLocation> {
    const response = await this.post<FileSystemLocation>(this.getEndpoint('LOCATIONS'), {
      name,
      type,
      credentials,
    });
    return response.data;
  }

  async deleteLocation(id: string): Promise<void> {
    await this.delete(this.getEndpoint('LOCATION_BY_ID', id));
  }

  // File Operations
  async listFiles(
    locationId: string,
    path: string,
    showHidden = false
  ): Promise<FileListResponse> {
    const response = await this.get<FileListResponse>(
      this.getEndpoint('FILES', locationId),
      {
        params: {
          path,
          showHidden,
        },
      }
    );
    return response.data;
  }

  async downloadFile(locationId: string, path: string): Promise<Blob> {
    const response = await this.api.get(this.getEndpoint('DOWNLOAD', locationId, path), {
      responseType: 'blob',
    });
    return new Blob([response.data], { type: response.headers['content-type'] });
  }

  async uploadFiles(
    locationId: string,
    path: string,
    files: File[]
  ): Promise<void> {
    const formData = new FormData();
    formData.append('path', path);
    files.forEach((file) => formData.append('files', file));

    await this.post(this.getEndpoint('UPLOAD', locationId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async copyFiles(locationId: string, request: CopyMoveRequest): Promise<void> {
    await this.post(this.getEndpoint('COPY', locationId), request);
  }

  async moveFiles(locationId: string, request: CopyMoveRequest): Promise<void> {
    await this.post(this.getEndpoint('MOVE', locationId), request);
  }

  async createDirectory(
    locationId: string,
    path: string,
    name: string
  ): Promise<void> {
    await this.post(this.getEndpoint('MKDIR', locationId), {
      path,
      name,
    });
  }

  async deleteFiles(locationId: string, paths: string[]): Promise<void> {
    await this.post(this.getEndpoint('DELETE', locationId, paths[0]), {
      paths,
    });
  }

  // Spaces Management
  async listSpaces(): Promise<Space[]> {
    const response = await this.get<Space[]>(this.getEndpoint('SPACES'));
    return response.data || [];
  }

  async createSpace(request: CreateSpaceRequest): Promise<Space> {
    const response = await this.post<Space>(this.getEndpoint('SPACES'), request);
    return response.data;
  }

  async updateSpace(id: string, request: CreateSpaceRequest): Promise<Space> {
    const response = await this.put<Space>(this.getEndpoint('SPACE_BY_ID', id), request);
    return response.data;
  }

  async deleteSpace(id: string): Promise<void> {
    await this.delete(this.getEndpoint('SPACE_BY_ID', id));
  }

  // Quick Access
  async getQuickAccess(): Promise<QuickAccessResponse> {
    const response = await this.get<QuickAccessResponse>(this.getEndpoint('QUICK_ACCESS'));
    return response.data;
  }

  async addToFavorites(locationId: string, path: string): Promise<void> {
    await this.post(this.getEndpoint('FAVORITES'), {
      locationId,
      path,
    });
  }

  async removeFromFavorites(locationId: string, path: string): Promise<void> {
    await this.delete(this.getEndpoint('FAVORITES'), {
      data: {
        locationId,
        path,
      },
    });
  }

  // File Selection
  async openFileSelector(request: SelectRequest): Promise<FileItem[]> {
    const response = await this.post<FileItem[]>(this.getEndpoint('SELECT'), request);
    return response.data;
  }

  // WebSocket Events
  subscribeToFileChanges(
    locationId: string,
    path: string,
    callback: (event: FileChangeEvent) => void
  ): () => void {
    const socket = this.getSocket();
    const event = this.getEndpoint('FILE_CHANGES', locationId, path);
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }

  subscribeToTransferProgress(
    operationId: string,
    callback: (event: TransferProgressEvent) => void
  ): () => void {
    const socket = this.getSocket();
    const event = this.getEndpoint('TRANSFER_PROGRESS', operationId);
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }

  protected getSocket(): Socket {
    return this.api.socket;
  }
}
