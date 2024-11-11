declare module 'socket.io-client' {
    import { EventEmitter } from 'events';

    interface ManagerOptions {
        path?: string;
        parser?: {
            encode: (packet: unknown) => unknown;
            decode: (packet: unknown) => unknown;
        };
        autoConnect?: boolean;
        query?: Record<string, string>;
        auth?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
        reconnection?: boolean;
        reconnectionAttempts?: number;
        reconnectionDelay?: number;
        reconnectionDelayMax?: number;
        randomizationFactor?: number;
        timeout?: number;
        transports?: string[];
    }

    interface SocketOptions extends ManagerOptions {
        forceNew?: boolean;
        multiplex?: boolean;
    }

    interface Socket extends EventEmitter {
        connected: boolean;
        disconnected: boolean;
        id: string;

        open(): Socket;
        connect(): Socket;
        send(...args: unknown[]): Socket;
        emit(ev: string, ...args: unknown[]): Socket;
        close(): Socket;
        disconnect(): Socket;
        compress(compress: boolean): Socket;
        on(ev: string, listener: (...args: unknown[]) => void): this;
        once(ev: string, listener: (...args: unknown[]) => void): this;
        off(ev: string, listener?: (...args: unknown[]) => void): this;
        removeListener(ev: string, listener?: (...args: unknown[]) => void): this;
        removeAllListeners(ev?: string): this;
        listeners(ev: string): Array<(...args: unknown[]) => void>;
    }

    interface Manager extends EventEmitter {
        reconnection(v: boolean): Manager;
        reconnectionAttempts(v: number): Manager;
        reconnectionDelay(v: number): Manager;
        reconnectionDelayMax(v: number): Manager;
        timeout(v: number): Manager;
        open(fn?: (err?: Error) => void): Manager;
        connect(fn?: (err?: Error) => void): Manager;
        socket(nsp: string, opts?: Partial<SocketOptions>): Socket;
    }

    interface ConnectOpts extends ManagerOptions {
        forceNew?: boolean;
        multiplex?: boolean;
    }

    interface SocketStatic {
        (uri: string, opts?: Partial<ConnectOpts>): Socket;
        (opts?: Partial<ConnectOpts>): Socket;
        connect(uri: string, opts?: Partial<ConnectOpts>): Socket;
        connect(opts?: Partial<ConnectOpts>): Socket;
        protocol: number;
        Manager: new (uri?: string, opts?: Partial<ManagerOptions>) => Manager;
        Socket: new (io: Manager, nsp: string, opts?: Partial<SocketOptions>) => Socket;
    }

    const io: SocketStatic;
    export = io;
}
