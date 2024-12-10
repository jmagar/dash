import { TransportError } from '../types/transport/errors';
import type { 
    TransportErrorName, 
    TransportErrorCode 
} from '../types/transport/errors';

// Re-export error types
export type { TransportErrorName, TransportErrorCode } from '../types/transport/errors';
export { TransportError } from '../types/transport/errors';

export interface TransportOptions {
    level?: string;
    format?: string;
    destination?: string;
    metadata?: Record<string, unknown>;
}

export interface TransportStreamOptions extends TransportOptions {
    format?: string;
    destination: string;
}

export interface TransportMetrics {
    bytesWritten: number;
    messagesWritten: number;
    errors: number;
    lastWrite?: Date;
    lastError?: Date;
}

export class BaseTransportError extends TransportError {
    static readonly ErrorCodes = {
        ...TransportError.ErrorCodes,
        WRITE_ERROR: 'WRITE_ERROR' as const,
        CLOSE_ERROR: 'CLOSE_ERROR' as const,
    };

    readonly name: TransportErrorName = 'BaseTransportError';

    constructor(
        message: string,
        code: TransportErrorCode,
        details?: Record<string, unknown>
    ) {
        super(message, code, details);
        Object.setPrototypeOf(this, BaseTransportError.prototype);
    }
}

export class ConsoleTransportError extends BaseTransportError {
    static readonly ErrorCodes = {
        ...BaseTransportError.ErrorCodes,
        CONSOLE_ERROR: 'CONSOLE_ERROR' as const,
    };

    readonly name: TransportErrorName = 'ConsoleTransportError';

    constructor(
        message: string,
        code: TransportErrorCode,
        details?: Record<string, unknown>
    ) {
        super(message, code, details);
        Object.setPrototypeOf(this, ConsoleTransportError.prototype);
    }
}

export class FileTransportError extends BaseTransportError {
    static readonly ErrorCodes = {
        ...BaseTransportError.ErrorCodes,
        FILE_NOT_FOUND: 'FILE_NOT_FOUND' as const,
        PERMISSION_DENIED: 'PERMISSION_DENIED' as const,
        PATH_ERROR: 'PATH_ERROR' as const,
    };

    readonly name: TransportErrorName = 'FileTransportError';

    constructor(
        message: string,
        code: TransportErrorCode,
        details?: Record<string, unknown>
    ) {
        super(message, code, details);
        Object.setPrototypeOf(this, FileTransportError.prototype);
    }
}

export class NetworkTransportError extends BaseTransportError {
    static readonly ErrorCodes = {
        ...BaseTransportError.ErrorCodes,
        CONNECTION_ERROR: 'CONNECTION_ERROR' as const,
        TIMEOUT_ERROR: 'TIMEOUT_ERROR' as const,
        PROTOCOL_ERROR: 'PROTOCOL_ERROR' as const,
    };

    readonly name: TransportErrorName = 'NetworkTransportError';

    constructor(
        message: string,
        code: TransportErrorCode,
        details?: Record<string, unknown>
    ) {
        super(message, code, details);
        Object.setPrototypeOf(this, NetworkTransportError.prototype);
    }
}

export function formatMessage(message: unknown, _format?: string): string {
    if (typeof message === 'string') {
        return message;
    }
    
    if (message instanceof Error) {
        return message.message;
    }
    
    if (typeof message === 'object' && message !== null) {
        try {
            return JSON.stringify(message);
        } catch {
            return String(message);
        }
    }
    
    return String(message);
}

export function validateTransportOptions(options: TransportOptions): void {
    if (options.level && typeof options.level !== 'string') {
        throw new BaseTransportError(
            'Invalid level option',
            'INVALID_OPTION',
            { level: options.level }
        );
    }

    if (options.format && typeof options.format !== 'string') {
        throw new BaseTransportError(
            'Invalid format option',
            'INVALID_OPTION',
            { format: options.format }
        );
    }

    if (options.destination && typeof options.destination !== 'string') {
        throw new BaseTransportError(
            'Invalid destination option',
            'INVALID_OPTION',
            { destination: options.destination }
        );
    }
}
