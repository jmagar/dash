import { handleApiResponse } from '../utils/api';

export interface FileOperationResponse {
  success: boolean;
  error?: string;
  data?: any;
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

class FileOperationsClient {
  async createFolder(hostId: string, request: CreateFolderRequest): Promise<FileOperationResponse> {
    const response = await fetch(`/api/hosts/${hostId}/files/folder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleApiResponse(response);
  }

  async rename(hostId: string, request: RenameRequest): Promise<FileOperationResponse> {
    const response = await fetch(`/api/hosts/${hostId}/files/rename`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleApiResponse(response);
  }

  async delete(hostId: string, request: DeleteRequest): Promise<FileOperationResponse> {
    const response = await fetch(`/api/hosts/${hostId}/files`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleApiResponse(response);
  }

  async move(hostId: string, request: MoveRequest): Promise<FileOperationResponse> {
    const response = await fetch(`/api/hosts/${hostId}/files/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleApiResponse(response);
  }

  async copy(hostId: string, request: CopyRequest): Promise<FileOperationResponse> {
    const response = await fetch(`/api/hosts/${hostId}/files/copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleApiResponse(response);
  }

  async upload(hostId: string, path: string, files: FileList): Promise<FileOperationResponse> {
    const formData = new FormData();
    formData.append('path', path);
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`/api/hosts/${hostId}/files/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleApiResponse(response);
  }
}

export const fileOperations = new FileOperationsClient();
