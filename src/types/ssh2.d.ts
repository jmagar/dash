declare module 'ssh2' {
  import { EventEmitter } from 'events';

  export interface ClientConfig {
    host: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: Buffer | string;
    passphrase?: string;
    readyTimeout?: number;
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
    debug?: (message: string) => void;
  }

  export interface ExecOptions {
    command: string;
    env?: Record<string, string>;
    pty?: boolean | {
      rows: number;
      cols: number;
      height: number;
      width: number;
      term: string;
    };
  }

  export interface ShellOptions {
    rows?: number;
    cols?: number;
    height?: number;
    width?: number;
    term?: string;
    env?: Record<string, string>;
  }

  export interface SFTPStats {
    mode: number;
    uid: number;
    gid: number;
    size: number;
    atime: number;
    mtime: number;
  }

  export interface SFTPWrapper extends EventEmitter {
    readdir(path: string, callback: (err: Error | null, list: { filename: string; longname: string; attrs: SFTPStats }[]) => void): void;
    readFile(path: string, callback: (err: Error | null, data: Buffer) => void): void;
    writeFile(path: string, data: Buffer, callback: (err: Error | null) => void): void;
    unlink(path: string, callback: (err: Error | null) => void): void;
    rename(oldPath: string, newPath: string, callback: (err: Error | null) => void): void;
    mkdir(path: string, callback: (err: Error | null) => void): void;
    rmdir(path: string, callback: (err: Error | null) => void): void;
    stat(path: string, callback: (err: Error | null, stats: SFTPStats) => void): void;
    lstat(path: string, callback: (err: Error | null, stats: SFTPStats) => void): void;
    setstat(path: string, attrs: Partial<SFTPStats>, callback: (err: Error | null) => void): void;
    fastGet(remotePath: string, localPath: string, callback: (err: Error | null) => void): void;
    fastPut(localPath: string, remotePath: string, callback: (err: Error | null) => void): void;
  }

  export class Client extends EventEmitter {
    constructor();
    connect(config: ClientConfig): void;
    exec(
      command: string,
      callback: (err: Error | null, channel: unknown) => void
    ): void;
    exec(
      command: string,
      options: ExecOptions,
      callback: (err: Error | null, channel: unknown) => void
    ): void;
    shell(callback: (err: Error | null, channel: unknown) => void): void;
    shell(
      options: ShellOptions,
      callback: (err: Error | null, channel: unknown) => void
    ): void;
    sftp(callback: (err: Error | null, sftp: SFTPWrapper) => void): void;
    end(): void;

    on(event: 'ready', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export { Client, ClientConfig, ExecOptions, ShellOptions, SFTPStats, SFTPWrapper };
}
