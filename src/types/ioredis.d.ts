declare module 'ioredis' {
    import { EventEmitter } from 'events';

    interface RedisOptions {
        port?: number;
        host?: string;
        username?: string;
        password?: string;
        db?: number;
        sentinels?: Array<{ host: string; port: number }>;
        name?: string;
        retryStrategy?: (times: number) => number | void | null;
        reconnectOnError?: (error: Error) => boolean | 1 | 2;
        connectTimeout?: number;
        disconnectTimeout?: number;
        maxRetriesPerRequest?: number;
        enableReadyCheck?: boolean;
        autoResubscribe?: boolean;
        autoResendUnfulfilledCommands?: boolean;
        lazyConnect?: boolean;
        keyPrefix?: string;
        tls?: Record<string, unknown>;
    }

    interface Pipeline {
        exec(): Promise<Array<[Error | null, unknown]>>;
        get(key: string): Pipeline;
        set(key: string, value: string | number | Buffer, ...args: unknown[]): Pipeline;
        del(...keys: string[]): Pipeline;
        hdel(key: string, ...fields: string[]): Pipeline;
        hget(key: string, field: string): Pipeline;
        hgetall(key: string): Pipeline;
        hmset(key: string, ...args: (string | number | Buffer)[]): Pipeline;
        hset(key: string, field: string, value: string | number | Buffer): Pipeline;
        expire(key: string, seconds: number): Pipeline;
        lpush(key: string, ...values: string[]): Pipeline;
        lrange(key: string, start: number, stop: number): Pipeline;
        [command: string]: (...args: unknown[]) => Pipeline;
    }

    interface Multi extends Pipeline {
        exec(): Promise<Array<[Error | null, unknown]>>;
    }

    interface RedisEvents {
        connect: () => void;
        ready: () => void;
        error: (error: Error) => void;
        close: () => void;
        reconnecting: (params: { delay: number; attempt: number }) => void;
        end: () => void;
        warning: (warning: string) => void;
        beforeRequest: () => void;
    }

    class Redis extends EventEmitter {
      constructor(options?: RedisOptions);
      constructor(port?: number, host?: string, options?: RedisOptions);

      connect(): Promise<void>;
      disconnect(): void;
      quit(): Promise<'OK'>;
      ping(): Promise<'PONG'>;
      info(section?: string): Promise<string>;

      get(key: string): Promise<string | null>;
      set(key: string, value: string | number | Buffer, mode?: string, duration?: number): Promise<'OK' | null>;
      del(...keys: string[]): Promise<number>;

      hdel(key: string, ...fields: string[]): Promise<number>;
      hget(key: string, field: string): Promise<string | null>;
      hgetall(key: string): Promise<Record<string, string>>;
      hmset(key: string, ...args: (string | number | Buffer)[]): Promise<'OK'>;
      hset(key: string, field: string, value: string | number | Buffer): Promise<number>;

      expire(key: string, seconds: number): Promise<number>;
      lpush(key: string, ...values: string[]): Promise<number>;
      lrange(key: string, start: number, stop: number): Promise<string[]>;

      pipeline(): Pipeline;
      multi(): Multi;

      on<K extends keyof RedisEvents>(event: K, listener: RedisEvents[K]): this;
      once<K extends keyof RedisEvents>(event: K, listener: RedisEvents[K]): this;
      off<K extends keyof RedisEvents>(event: K, listener: RedisEvents[K]): this;
      removeListener<K extends keyof RedisEvents>(event: K, listener: RedisEvents[K]): this;

      status: string;
        [command: string]: (...args: unknown[]) => Promise<unknown>;
    }

    export = Redis;
}
