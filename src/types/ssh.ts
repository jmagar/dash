import { Readable } from 'stream';

export interface SSHStream {
  readable: boolean;
  writable: boolean;
  stderr: Readable;
  write(data: string | Buffer): boolean;
  end(): void;
  setWindow(rows: number, cols: number): void;
  on(event: 'data', listener: (data: Buffer) => void): this;
  on(event: 'close', listener: (code: number) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'end', listener: () => void): this;
  pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
}

export interface SSHExecOptions {
  env?: { [key: string]: string };
  pty?: boolean;
  x11?: boolean;
  rows?: number;
  cols?: number;
  term?: string;
}

export interface SSHShellOptions {
  term?: string;
  rows?: number;
  cols?: number;
  pty?: boolean;
}

export interface SSHClient {
  exec(
    command: string,
    options: SSHExecOptions | undefined,
    callback: (err: Error | undefined, stream: SSHStream) => void
  ): void;
  exec(
    command: string,
    callback: (err: Error | undefined, stream: SSHStream) => void
  ): void;
  shell(
    options: SSHShellOptions | undefined,
    callback: (err: Error | undefined, stream: SSHStream) => void
  ): void;
  shell(
    callback: (err: Error | undefined, stream: SSHStream) => void
  ): void;
  on(event: 'ready', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  connect(config: {
    host: string;
    port: number;
    username: string;
    privateKey?: string;
    passphrase?: string;
  }): void;
  end(): void;
}

export interface SSHHostConnection {
  id: string;
  hostname: string;
  port: number;
  username?: string;
  private_key?: string;
  passphrase?: string;
}
