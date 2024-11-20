import { BaseAPIClient } from './base.client';
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
} from '../../types/filesystem';

export class FilesystemClient extends BaseAPIClient {
  private static instance: FilesystemClient;

  private constructor() {
    super();
  }

  static getInstance(): FilesystemClient {
    if (!FilesystemClient.instance) {
      FilesystemClient.instance = new FilesystemClient();
    }
    return FilesystemClient.instance;
  }

  // Location Management
  async listLocations(): Promise<FileSystemLocation[]> {
    const response = await this.get<FileSystemLocation[]>('/api/fs/locations');
    return response.data || [];
  }

  async createLocation(
    name: string,
    type: string,
    credentials: FileSystemCredentials
  ): Promise<FileSystemLocation> {
    const response = await this.post<FileSystemLocation>('/api/fs/locations', {
      name,
      type,
      credentials,
    });
    return response.data;
  }

  async deleteLocation(id: string): Promise<void> {
    await this.delete(`/api/fs/locations/${id}`);
  }

  // File Operations
  async listFiles(
    locationId: string,
    path: string,
    showHidden = false
  ): Promise<FileListResponse> {
    const response = await this.get<FileListResponse>(
      `/api/fs/${locationId}/files`,
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
    const response = await this.get(`/api/fs/${locationId}/files/download`, {
      params: { path },
      responseType: 'blob',
    });
    return response.data;
  }

  async uploadFiles(
    locationId: string,
    path: string,
    files: File[]
  ): Promise<void> {
    const formData = new FormData();
    formData.append('path', path);
    files.forEach((file) => formData.append('files', file));

    await this.post(`/api/fs/${locationId}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async copyFiles(locationId: string, request: CopyMoveRequest): Promise<void> {
    await this.post(`/api/fs/${locationId}/files/copy`, request);
  }

  async moveFiles(locationId: string, request: CopyMoveRequest): Promise<void> {
    await this.post(`/api/fs/${locationId}/files/move`, request);
  }

  async createDirectory(
    locationId: string,
    path: string,
    name: string
  ): Promise<void> {
    await this.post(`/api/fs/${locationId}/files/mkdir`, {
      path,
      name,
    });
  }

  async deleteFiles(locationId: string, paths: string[]): Promise<void> {
    await this.post(`/api/fs/${locationId}/files/delete`, {
      paths,
    });
  }

  // Spaces Management
  async listSpaces(): Promise<Space[]> {
    const response = await this.get<Space[]>('/api/fs/spaces');
    return response.data || [];
  }

  async createSpace(request: CreateSpaceRequest): Promise<Space> {
    const response = await this.post<Space>('/api/fs/spaces', request);
    return response.data;
  }

  async updateSpace(id: string, request: CreateSpaceRequest): Promise<Space> {
    const response = await this.put<Space>(`/api/fs/spaces/${id}`, request);
    return response.data;
  }

  async deleteSpace(id: string): Promise<void> {
    await this.delete(`/api/fs/spaces/${id}`);
  }

  // Quick Access
  async getQuickAccess(): Promise<QuickAccessResponse> {
    const response = await this.get<QuickAccessResponse>('/api/fs/quick-access');
    return response.data;
  }

  async addToFavorites(locationId: string, path: string): Promise<void> {
    await this.post('/api/fs/quick-access/favorites', {
      locationId,
      path,
    });
  }

  async removeFromFavorites(locationId: string, path: string): Promise<void> {
    await this.delete('/api/fs/quick-access/favorites', {
      data: {
        locationId,
        path,
      },
    });
  }

  // File Selection
  async openFileSelector(request: SelectRequest): Promise<FileItem[]> {
    const response = await this.post<FileItem[]>('/api/fs/select', request);
    return response.data;
  }

  // WebSocket Events
  subscribeToFileChanges(
    locationId: string,
    path: string,
    callback: (event: any) => void
  ): () => void {
    const socket = this.getSocket();
    const event = `fs:changes:${locationId}:${path}`;
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }

  subscribeToTransferProgress(
    operationId: string,
    callback: (event: any) => void
  ): () => void {
    const socket = this.getSocket();
    const event = `fs:transfer:${operationId}`;
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }
}
