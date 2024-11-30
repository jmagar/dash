export type TransportErrorName = 
    | 'TransportError' 
    | 'BaseTransportError' 
    | 'ConsoleTransportError' 
    | 'FileTransportError' 
    | 'NetworkTransportError';

export type TransportErrorCode =
    | 'UNKNOWN_ERROR'
    | 'INVALID_OPTION'
    | 'INITIALIZATION_ERROR'
    | 'FORMAT_ERROR'
    | 'WRITE_ERROR'
    | 'CLOSE_ERROR'
    | 'CONSOLE_ERROR'
    | 'FILE_NOT_FOUND'
    | 'PERMISSION_DENIED'
    | 'PATH_ERROR'
    | 'CONNECTION_ERROR'
    | 'TIMEOUT_ERROR'
    | 'PROTOCOL_ERROR';

export abstract class TransportError extends Error {
    static readonly ErrorCodes = {
        UNKNOWN_ERROR: 'UNKNOWN_ERROR',
        INVALID_OPTION: 'INVALID_OPTION',
        INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
        FORMAT_ERROR: 'FORMAT_ERROR',
    } as const;

    readonly code: TransportErrorCode;
    readonly details?: Record<string, unknown>;
    abstract readonly name: TransportErrorName;

    constructor(
        message: string,
        code: TransportErrorCode,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, TransportError.prototype);
    }

    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
        };
    }

    toString(): string {
        const details = this.details ? ` (${JSON.stringify(this.details)})` : '';
        return `${this.name}: [${this.code}] ${this.message}${details}`;
    }
}
