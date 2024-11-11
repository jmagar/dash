declare module 'pg' {
    export interface PoolConfig {
        user?: string;
        password?: string;
        host?: string;
        port?: number;
        database?: string;
        connectionString?: string;
        ssl?: boolean | { rejectUnauthorized?: boolean };
        max?: number;
        min?: number;
        idleTimeoutMillis?: number;
        connectionTimeoutMillis?: number;
        application_name?: string;
    }

    export interface QueryResult<T = any> {
        rows: T[];
        fields: FieldDef[];
        rowCount: number;
        command: string;
        oid: number;
    }

    export interface FieldDef {
        name: string;
        tableID: number;
        columnID: number;
        dataTypeID: number;
        dataTypeSize: number;
        dataTypeModifier: number;
        format: string;
    }

    export class Pool {
      constructor(config?: PoolConfig);
      connect(): Promise<PoolClient>;
      end(): Promise<void>;
      query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
      on(event: string, listener: (...args: any[]) => void): this;
      totalCount: number;
      idleCount: number;
      waitingCount: number;
    }

    export interface PoolClient {
        query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
        release(err?: Error): void;
        on(event: string, listener: (...args: any[]) => void): this;
    }

    export class Client {
      constructor(config?: PoolConfig);
      connect(): Promise<void>;
      end(): Promise<void>;
      query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
      on(event: string, listener: (...args: any[]) => void): this;
    }
}
