import type { FileItem } from '../../types/models-shared';
import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';

type FileExplorerEndpoints = Record<string, Endpoint> & {
  LIST: Endpoint;
  READ: Endpoint;
  WRITE: Endpoint;
  DELETE: Endpoint;
  RENAME: Endpoint;
  MKDIR: Endpoint;
  SEARCH: Endpoint;
};

const FILE_ENDPOINTS: FileExplorerEndpoints = {
  LIST: (...args: EndpointParams[]) => `/files/${args[0]}/list`,
  READ: (...args: EndpointParams[]) => `/files/${args[0]}/read`,
  WRITE: (...args: EndpointParams[]) => `/files/${args[0]}/write`,
  DELETE: (...args: EndpointParams[]) => `/files/${args[0]}/delete`,
  RENAME: (...args: EndpointParams[]) => `/files/${args[0]}/rename`,
  MKDIR: (...args: EndpointParams[]) => `/files/${args[0]}/mkdir`,
  SEARCH: (...args: EndpointParams[]) => `/files/${args[0]}/search`,
};

class FileExplorerClient extends BaseApiClient<FileExplorerEndpoints> {
  constructor() {
    super(FILE_ENDPOINTS);
  }

  /**
   * Lists files in the specified directory.
   * 
   * @param hostId The ID of the host.
   * @param path The path to the directory.
   * @returns A list of file items.
   */
  async listFiles(hostId: string, path: string): Promise<FileItem[]> {
    const response = await this.get<FileItem[]>(
      this.getEndpoint('LIST', hostId),
      { params: { path } }
    );
    if (!response.data) {
      return [];
    }
    return response.data;
  }

  /**
   * Reads the contents of a file.
   * 
   * @param hostId The ID of the host.
   * @param path The path to the file.
   * @returns The contents of the file.
   * @throws {Error} If the file cannot be read.
   */
  async readFile(hostId: string, path: string): Promise<string> {
    const response = await this.get<string>(
      this.getEndpoint('READ', hostId),
      { params: { path } }
    );
    if (!response.data) {
      throw new Error('Failed to read file');
    }
    return response.data;
  }

  /**
   * Writes to a file.
   * 
   * @param hostId The ID of the host.
   * @param path The path to the file.
   * @param content The contents to write.
   */
  async writeFile(hostId: string, path: string, content: string): Promise<void> {
    await this.post<void>(this.getEndpoint('WRITE', hostId), {
      path,
      content,
    });
  }

  /**
   * Deletes a file.
   * 
   * @param hostId The ID of the host.
   * @param path The path to the file.
   */
  async deleteFile(hostId: string, path: string): Promise<void> {
    await this.delete<void>(
      this.getEndpoint('DELETE', hostId),
      { params: { path } }
    );
  }

  /**
   * Renames a file.
   * 
   * @param hostId The ID of the host.
   * @param oldPath The current path to the file.
   * @param newPath The new path for the file.
   */
  async renameFile(hostId: string, oldPath: string, newPath: string): Promise<void> {
    await this.post<void>(this.getEndpoint('RENAME', hostId), {
      oldPath,
      newPath,
    });
  }

  /**
   * Creates a new directory.
   * 
   * @param hostId The ID of the host.
   * @param path The path to the new directory.
   */
  async createDirectory(hostId: string, path: string): Promise<void> {
    await this.post<void>(this.getEndpoint('MKDIR', hostId), { path });
  }

  /**
   * Searches for files.
   * 
   * @param hostId The ID of the host.
   * @param query The search query.
   * @returns A list of file items.
   */
  async searchFiles(hostId: string, query: string): Promise<FileItem[]> {
    const response = await this.get<FileItem[]>(
      this.getEndpoint('SEARCH', hostId),
      { params: { query } }
    );
    if (!response.data) {
      return [];
    }
    return response.data;
  }
}

// Create a single instance
const fileExplorerClient = new FileExplorerClient();

// Export bound methods
export const {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  renameFile,
  createDirectory,
  searchFiles,
} = fileExplorerClient;
