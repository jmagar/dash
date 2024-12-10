import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import type { ApiResponse } from '../../types/express';
import type { FileInfo } from '../../types/files';

export interface FileOperationResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface CreateFolderRequest {
  path: string;
  name: string;
}

export interface RenameRequest {
  oldPath: string;
  newPath: string;
}

export interface DeleteRequest {
  paths: string[];
}

export interface MoveRequest {
  sourcePaths: string[];
  targetPath: string;
}

export interface CopyRequest {
  sourcePaths: string[];
  targetPath: string;
}

export interface ListFilesResponse {
  files: FileInfo[];
  totalCount: number;
  currentPath: string;
}

type FileOperationsEndpoints = Record<string, Endpoint> & {
  CREATE_FOLDER: Endpoint;
  RENAME: Endpoint;
  DELETE: Endpoint;
  MOVE: Endpoint;
  COPY: Endpoint;
  UPLOAD: Endpoint;
  OPEN: Endpoint;
};

const FILE_OPERATIONS_ENDPOINTS: FileOperationsEndpoints = {
  CREATE_FOLDER: (...args: EndpointParams[]) => `/api/hosts/${String(args[0])}/files/folder`,
  RENAME: (...args: EndpointParams[]) => `/api/hosts/${String(args[0])}/files/rename`,
  DELETE: (...args: EndpointParams[]) => `/api/hosts/${String(args[0])}/files`,
  MOVE: (...args: EndpointParams[]) => `/api/hosts/${String(args[0])}/files/move`,
  COPY: (...args: EndpointParams[]) => `/api/hosts/${String(args[0])}/files/copy`,
  UPLOAD: (...args: EndpointParams[]) => `/api/hosts/${String(args[0])}/files/upload`,
  OPEN: (...args: EndpointParams[]) => `/api/hosts/${String(args[0])}/files/open`,
};

class FileOperationsClient extends BaseApiClient<FileOperationsEndpoints> {
  constructor() {
    super(FILE_OPERATIONS_ENDPOINTS);
  }

  async createFolder(hostId: string, request: CreateFolderRequest): Promise<FileOperationResponse> {
    const response = await this.post<FileOperationResponse>(
      this.getEndpoint('CREATE_FOLDER', hostId),
      request
    );

    if (!response.data) {
      throw new Error('Failed to create folder');
    }

    return response.data;
  }

  async rename(hostId: string, request: RenameRequest): Promise<FileOperationResponse> {
    const response = await this.post<FileOperationResponse>(
      this.getEndpoint('RENAME', hostId),
      request
    );

    if (!response.data) {
      throw new Error('Failed to rename file/folder');
    }

    return response.data;
  }

  async deleteFiles(hostId: string, request: DeleteRequest): Promise<FileOperationResponse> {
    const response = await this.delete<FileOperationResponse>(
      this.getEndpoint('DELETE', hostId),
      { data: request }
    );

    if (!response.data) {
      throw new Error('Failed to delete files/folders');
    }

    return response.data;
  }

  async move(hostId: string, request: MoveRequest): Promise<FileOperationResponse> {
    const response = await this.post<FileOperationResponse>(
      this.getEndpoint('MOVE', hostId),
      request
    );

    if (!response.data) {
      throw new Error('Failed to move files/folders');
    }

    return response.data;
  }

  async copy(hostId: string, request: CopyRequest): Promise<FileOperationResponse> {
    const response = await this.post<FileOperationResponse>(
      this.getEndpoint('COPY', hostId),
      request
    );

    if (!response.data) {
      throw new Error('Failed to copy files/folders');
    }

    return response.data;
  }

  async upload(hostId: string, path: string, files: FileList): Promise<FileOperationResponse> {
    const formData = new FormData();
    formData.append('path', path);
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    const response = await this.post<FileOperationResponse>(
      this.getEndpoint('UPLOAD', hostId),
      formData,
      {
        headers: {
          // Let the browser set the Content-Type header with boundary
          'Content-Type': undefined,
        },
      }
    );

    if (!response.data) {
      throw new Error('Failed to upload files');
    }

    return response.data;
  }

  async listFiles(hostId: string, path: string): Promise<ApiResponse<ListFilesResponse>> {
    const response = await this.get<ListFilesResponse>(
      `/api/hosts/${hostId}/files?path=${encodeURIComponent(path)}`
    );

    if (!response.data) {
      throw new Error('Failed to list files');
    }

    return response;
  }

  async openFile(hostId: string, path: string, app: string): Promise<FileOperationResponse> {
    const response = await this.post<FileOperationResponse>(
      this.getEndpoint('OPEN', hostId),
      { path, app }
    );

    if (!response.data) {
      throw new Error('Failed to open file');
    }

    return response.data;
  }
}

// Create a single instance
const fileOperationsInstance = new FileOperationsClient();

// Export bound methods directly
export const createFolder = fileOperationsInstance.createFolder.bind(fileOperationsInstance);
export const rename = fileOperationsInstance.rename.bind(fileOperationsInstance);
export const move = fileOperationsInstance.move.bind(fileOperationsInstance);
export const copy = fileOperationsInstance.copy.bind(fileOperationsInstance);
export const upload = fileOperationsInstance.upload.bind(fileOperationsInstance);
export const listFiles = fileOperationsInstance.listFiles.bind(fileOperationsInstance);
export const openFile = fileOperationsInstance.openFile.bind(fileOperationsInstance);
export const deleteFiles = fileOperationsInstance.deleteFiles.bind(fileOperationsInstance);

// Export the instance if needed
export const fileOperations = fileOperationsInstance;
