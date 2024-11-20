import type { FileItem } from '../../types/models-shared';
import { BaseApiClient } from './base.client';

const FILE_ENDPOINTS = {
  LIST: (hostId: string) => `/files/${hostId}/list`,
  READ: (hostId: string) => `/files/${hostId}/read`,
  WRITE: (hostId: string) => `/files/${hostId}/write`,
  DELETE: (hostId: string) => `/files/${hostId}/delete`,
  RENAME: (hostId: string) => `/files/${hostId}/rename`,
  MKDIR: (hostId: string) => `/files/${hostId}/mkdir`,
  SEARCH: (hostId: string) => `/files/${hostId}/search`,
} as const;

class FileExplorerClient extends BaseApiClient {
  constructor() {
    super(FILE_ENDPOINTS);
  }

  async listFiles(hostId: string, path: string): Promise<FileItem[]> {
    const response = await this.get<FileItem[]>(this.getEndpoint('LIST', hostId), {
      params: { path },
    });
    return response.data;
  }

  async readFile(hostId: string, path: string): Promise<string> {
    const response = await this.get<string>(this.getEndpoint('READ', hostId), {
      params: { path },
    });
    return response.data;
  }

  async writeFile(hostId: string, path: string, content: string): Promise<void> {
    await this.post<void>(this.getEndpoint('WRITE', hostId), {
      path,
      content,
    });
  }

  async deleteFile(hostId: string, path: string): Promise<void> {
    await this.delete<void>(this.getEndpoint('DELETE', hostId), {
      params: { path },
    });
  }

  async renameFile(hostId: string, oldPath: string, newPath: string): Promise<void> {
    await this.post<void>(this.getEndpoint('RENAME', hostId), {
      oldPath,
      newPath,
    });
  }

  async createDirectory(hostId: string, path: string): Promise<void> {
    await this.post<void>(this.getEndpoint('MKDIR', hostId), {
      path,
    });
  }

  async searchFiles(hostId: string, query: string): Promise<FileItem[]> {
    const response = await this.get<FileItem[]>(this.getEndpoint('SEARCH', hostId), {
      params: { query },
    });
    return response.data;
  }
}

export const fileExplorerClient = new FileExplorerClient();
export const {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  renameFile,
  createDirectory,
  searchFiles,
} = fileExplorerClient;
