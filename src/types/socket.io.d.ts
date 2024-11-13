import type { Server as HttpServer } from 'http';
import type { Socket as NetSocket } from 'net';

import type { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';

declare module 'socket.io' {
  interface ServerOptions {
    path?: string;
    serveClient?: boolean;
    adapter?: unknown;
    origins?: string | string[];
    parser?: unknown;
    pingTimeout?: number;
    pingInterval?: number;
    upgradeTimeout?: number;
    maxHttpBufferSize?: number;
    allowRequest?: (req: unknown, fn: (err: string | null | undefined, success: boolean) => void) => void;
    transports?: string[];
    allowUpgrades?: boolean;
    perMessageDeflate?: boolean | Record<string, unknown>;
    httpCompression?: boolean | Record<string, unknown>;
    ws?: boolean;
    cors?: {
      origin?: string | string[] | boolean;
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      credentials?: boolean;
      maxAge?: number;
    };
  }

  class Socket extends SocketIOSocket {
    server: Server;
    adapter: unknown;
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
    };
    client: Socket;
    conn: NetSocket;
    rooms: Set<string>;
    connected: boolean;
    disconnected: boolean;
    readonly volatile: Socket;
  }

  class Server extends SocketIOServer {
    constructor(srv?: HttpServer | number, opts?: ServerOptions);
    path(): string;
    adapter(): unknown;
    origins(): string | string[];
    origins(v: string | string[]): Server;
    serveClient(v: boolean): Server;
    serveClient(): boolean;
    attach(srv: HttpServer, opts?: ServerOptions): Server;
    attach(port: number, opts?: ServerOptions): Server;
    bind(srv: HttpServer): Server;
    onconnection(socket: NetSocket): void;
    of(nsp: string | RegExp | ((socket: Socket) => boolean)): Server;
    close(fn?: (err?: Error) => void): void;
  }
}
