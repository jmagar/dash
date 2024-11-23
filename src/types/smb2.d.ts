declare module '@marsaud/smb2' {
  interface SMB2Options {
    share: string;
    domain?: string;
    username?: string;
    password?: string;
    autoCloseTimeout?: number;
  }

  interface SMB2Stats {
    size: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    isFile(): boolean;
    isDirectory(): boolean;
  }

  class SMB2 {
    constructor(options: SMB2Options);
    
    readdir(path: string): Promise<string[]>;
    readFile(path: string): Promise<Buffer>;
    writeFile(path: string, data: Buffer): Promise<void>;
    unlink(path: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    rmdir(path: string): Promise<void>;
    stat(path: string): Promise<SMB2Stats>;
    exists(path: string): Promise<boolean>;
    close(): Promise<void>;
  }

  export default SMB2;
}
