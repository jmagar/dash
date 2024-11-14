declare module 'express-fileupload' {
  import { Request, Response, NextFunction } from 'express';

  export interface FileUploadOptions {
    limits?: {
      fileSize?: number;
    };
    abortOnLimit?: boolean;
    safeFileNames?: boolean;
    preserveExtension?: boolean | number;
    useTempFiles?: boolean;
    tempFileDir?: string;
    debug?: boolean;
    uploadTimeout?: number;
    createParentPath?: boolean;
  }

  export interface FileArray {
    [filename: string]: UploadedFile | UploadedFile[];
  }

  export interface UploadedFile {
    name: string;
    encoding: string;
    mimetype: string;
    data: Buffer;
    tempFilePath: string;
    truncated: boolean;
    size: number;
    md5: string;
    mv(path: string, callback: (err: any) => void): void;
    mv(path: string): Promise<void>;
  }

  interface FileUploadRequestHandler {
    (req: Request, res: Response, next: NextFunction): void;
  }

  interface FileUpload {
    (options?: FileUploadOptions): FileUploadRequestHandler;
    FileUploadOptions: FileUploadOptions;
  }

  const fileUpload: FileUpload;
  export = fileUpload;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      files?: import('express-fileupload').FileArray;
    }
  }
}
