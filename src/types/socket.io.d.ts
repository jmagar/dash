import { Server as HttpServer } from 'http';

import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';

declare module 'socket.io' {
  interface ServerOptions {
    cors?: {
      origin?: string | string[];
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      credentials?: boolean;
      maxAge?: number;
    };
  }

  interface Socket extends SocketIOSocket {
    id: string;
    handshake: {
      headers: { [key: string]: string | undefined };
      time: string;
      address: string;
      xdomain: boolean;
      secure: boolean;
      issued: number;
      url: string;
      query: { [key: string]: string | undefined };
    };
  }

  interface Server extends SocketIOServer {
    new (srv: HttpServer | number, opts?: ServerOptions): Server;
    sockets: {
      sockets: Map<string, Socket>;
      adapter: any;
    };
  }
}
