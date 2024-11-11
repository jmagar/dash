declare module 'socket.io' {
    import { EventEmitter } from 'events';
    import { Server as HttpServer } from 'http';

    interface ServerOptions {
        path?: string;
        serveClient?: boolean;
        adapter?: {
            broadcast: (packet: unknown, opts: unknown) => void;
            add: (id: string, room: string) => void;
            del: (id: string, room: string) => void;
        };
        cors?: {
            origin?: string | string[] | boolean;
            methods?: string[];
            allowedHeaders?: string[];
            exposedHeaders?: string[];
            credentials?: boolean;
            maxAge?: number;
        };
        allowEIO3?: boolean;
        pingTimeout?: number;
        pingInterval?: number;
        upgradeTimeout?: number;
        maxHttpBufferSize?: number;
        transports?: string[];
    }

    interface Socket extends EventEmitter {
        id: string;
        handshake: {
            headers: Record<string, string>;
            time: string;
            address: string;
            xdomain: boolean;
            secure: boolean;
            issued: number;
            url: string;
            query: Record<string, string>;
            auth: Record<string, unknown>;
        };
        rooms: Set<string>;
        client: {
            id: string;
            conn: {
                id: string;
                transport: {
                    name: string;
                    writable: boolean;
                    readable: boolean;
                };
            };
        };
        conn: {
            id: string;
            transport: {
                name: string;
                writable: boolean;
                readable: boolean;
            };
        };
        data: Record<string, unknown>;

        join(room: string | string[]): Promise<void>;
        leave(room: string): Promise<void>;
        to(room: string | string[]): Socket;
        in(room: string | string[]): Socket;
        emit(ev: string, ...args: unknown[]): boolean;
        disconnect(close?: boolean): Socket;
        broadcast: Socket;

        on(event: string, listener: (...args: unknown[]) => void): this;
        once(event: string, listener: (...args: unknown[]) => void): this;
        off(event: string, listener?: (...args: unknown[]) => void): this;
    }

    interface Namespace extends EventEmitter {
        name: string;
        sockets: Map<string, Socket>;
        adapter: {
            rooms: Map<string, Set<string>>;
            sids: Map<string, Set<string>>;
            broadcast: (packet: unknown, opts: unknown) => void;
        };

        to(room: string | string[]): Namespace;
        in(room: string | string[]): Namespace;
        emit(ev: string, ...args: unknown[]): boolean;
        send(...args: unknown[]): Namespace;
        write(...args: unknown[]): Namespace;
        allSockets(): Promise<Set<string>>;
        use(fn: (socket: Socket, next: (err?: Error) => void) => void): Namespace;
    }

    interface EngineSocket {
        on(event: string, listener: (...args: unknown[]) => void): void;
        emit(event: string, ...args: unknown[]): void;
    }

    class Server extends EventEmitter {
      constructor(srv?: HttpServer | number, opts?: ServerOptions);

      path(): string;
      serveClient(v: boolean): Server;
      adapter(v: {
            broadcast: (packet: unknown, opts: unknown) => void;
            add: (id: string, room: string) => void;
            del: (id: string, room: string) => void;
        }): Server;
      origins(v: string | string[]): Server;
      attach(srv: HttpServer, opts?: ServerOptions): Server;
      listen(srv: HttpServer, opts?: ServerOptions): Server;
      bind(engine: EngineSocket): Server;
      onconnection(socket: Socket): Server;
      of(nsp: string | RegExp | ((socket: Socket) => boolean)): Namespace;
      close(fn?: (err?: Error) => void): void;

      on(event: 'connection', listener: (socket: Socket) => void): this;
      on(event: string, listener: (...args: unknown[]) => void): this;
    }

    export = Server;
}
