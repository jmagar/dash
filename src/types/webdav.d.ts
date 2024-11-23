declare module 'webdav' {
  export interface WebDAVClientOptions {
    username?: string;
    password?: string;
    digest?: boolean;
    maxContentLength?: number;
    maxBodyLength?: number;
  }

  export interface FileStat {
    filename: string;
    basename: string;
    lastmod: string;
    size: number;
    type: 'file' | 'directory';
    etag: string;
  }

  export interface WebDAVClient {
    getDirectoryContents(path: string): Promise<FileStat[]>;
    getFileContents(path: string, options?: { format: 'binary' }): Promise<Buffer>;
    putFileContents(path: string, data: Buffer): Promise<void>;
    deleteFile(path: string): Promise<void>;
    moveFile(source: string, destination: string): Promise<void>;
    createDirectory(path: string): Promise<void>;
    stat(path: string): Promise<FileStat>;
    exists(path: string): Promise<boolean>;
  }

  export function createClient(url: string, options?: WebDAVClientOptions): WebDAVClient;
}
