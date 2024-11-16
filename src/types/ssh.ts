import type { Client } from 'ssh2';

export type SSHClient = Client;

export interface ClientConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    privateKey?: string | Buffer;
    passphrase?: string;
    readyTimeout?: number;
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
    debug?: (information: string) => void;
}

// Separate options type for internal use vs. library interface
export interface SSHExecOptions {
    env?: Record<string, string>;
    pty?: boolean | {
        rows: number;
        cols: number;
        height: number;
        width: number;
        term: string;
    };
}

// Extended options for our service
export interface ExecuteOptions extends SSHExecOptions {
    timeout?: number;
}

export interface ExecOptions extends SSHExecOptions {
    command: string;
}

export interface SSHStream {
    stdin: NodeJS.WritableStream;
    stdout: NodeJS.ReadableStream;
    stderr: NodeJS.ReadableStream;
    on(event: 'close', listener: (code: number) => void): this;
    on(event: 'data', listener: (data: Buffer) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
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

export interface SFTPWrapper {
    fastGet(
        remotePath: string,
        localPath: string,
        options: Record<string, unknown>,
        callback: (err: Error | undefined) => void
    ): void;
    fastPut(
        localPath: string,
        remotePath: string,
        options: Record<string, unknown>,
        callback: (err: Error | undefined) => void
    ): void;
    createReadStream(path: string, options?: Record<string, unknown>): NodeJS.ReadableStream;
    createWriteStream(path: string, options?: Record<string, unknown>): NodeJS.WritableStream;
    readdir(
        location: string,
        callback: (
            err: Error | undefined,
            list: Array<{ filename: string; longname: string; attrs: SFTPStats }>
        ) => void
    ): void;
    unlink(path: string, callback: (err: Error | undefined) => void): void;
    rename(
        srcPath: string,
        destPath: string,
        callback: (err: Error | undefined) => void
    ): void;
    mkdir(path: string, callback: (err: Error | undefined) => void): void;
    rmdir(path: string, callback: (err: Error | undefined) => void): void;
    stat(
        path: string,
        callback: (err: Error | undefined, stats: SFTPStats) => void
    ): void;
    end(): void;
}

// Add type declarations for ssh2's exec callback
export interface SSHExecCallback {
    (err: Error | undefined, stream: SSHStream): void;
}

// Extend the Client type to include our specific exec method signature
declare module 'ssh2' {
    interface Client {
        exec(command: string, callback: SSHExecCallback): void;
        exec(command: string, options: SSHExecOptions, callback: SSHExecCallback): void;
    }
}
