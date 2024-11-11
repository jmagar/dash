declare module 'ssh2' {
    import { EventEmitter } from 'events';
    import { Readable, Writable } from 'stream';

    interface ClientConfig {
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        privateKey?: string | Buffer;
        passphrase?: string;
        readyTimeout?: number;
        keepaliveInterval?: number;
        keepaliveCountMax?: number;
        debug?: (information: string) => void;
    }

    interface ExecOptions {
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

    interface ShellOptions {
        rows?: number;
        cols?: number;
        height?: number;
        width?: number;
        term?: string;
        env?: Record<string, string>;
    }

    interface SFTPStats {
        mode: number;
        uid: number;
        gid: number;
        size: number;
        atime: number;
        mtime: number;
    }

    interface SFTPWrapper extends EventEmitter {
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
        createReadStream(path: string, options?: Record<string, unknown>): Readable;
        createWriteStream(path: string, options?: Record<string, unknown>): Writable;
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

    class Client extends EventEmitter {
      constructor();
      connect(config: ClientConfig): void;
      end(): void;
      exec(
            command: string,
            callback: (err: Error | undefined, channel: unknown) => void
        ): void;
      exec(
            command: string,
            options: ExecOptions,
            callback: (err: Error | undefined, channel: unknown) => void
        ): void;
      shell(callback: (err: Error | undefined, channel: unknown) => void): void;
      shell(
            options: ShellOptions,
            callback: (err: Error | undefined, channel: unknown) => void
        ): void;
      sftp(callback: (err: Error | undefined, sftp: SFTPWrapper) => void): void;

      on(event: 'ready', listener: () => void): this;
      on(event: 'error', listener: (err: Error) => void): this;
      on(event: 'end', listener: () => void): this;
      on(event: 'close', listener: () => void): this;
      on(event: string, listener: (...args: unknown[]) => void): this;
    }

    export { Client };
}
