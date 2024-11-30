import {
    BadRequestException,
    UnauthorizedException,
    NotFoundException,
    ForbiddenException,
    InternalServerErrorException,
    HttpException,
} from '@nestjs/common';

export class ShareError extends Error {
    constructor(
        message: string,
        public code: ShareErrorCode,
        public statusCode: number,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ShareError';
        Object.setPrototypeOf(this, ShareError.prototype);
    }

    static badRequest(message: string, code: ShareErrorCode, details?: Record<string, unknown>): ShareError {
        return new ShareError(message, code, 400, details);
    }

    static unauthorized(message: string, code: ShareErrorCode, details?: Record<string, unknown>): ShareError {
        return new ShareError(message, code, 401, details);
    }

    static forbidden(message: string, code: ShareErrorCode, details?: Record<string, unknown>): ShareError {
        return new ShareError(message, code, 403, details);
    }

    static notFound(message: string, code: ShareErrorCode, details?: Record<string, unknown>): ShareError {
        return new ShareError(message, code, 404, details);
    }

    static internal(message: string, code: ShareErrorCode, details?: Record<string, unknown>): ShareError {
        return new ShareError(message, code, 500, details);
    }
}

export const ShareErrorCodes = {
    INVALID_PATH: 'INVALID_PATH',
    PATH_NOT_FOUND: 'PATH_NOT_FOUND',
    SHARE_NOT_FOUND: 'SHARE_NOT_FOUND',
    SHARE_EXPIRED: 'SHARE_EXPIRED',
    INVALID_PASSWORD: 'INVALID_PASSWORD',
    INVALID_TOKEN: 'INVALID_TOKEN',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    INVALID_REQUEST: 'INVALID_REQUEST',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_OPERATION: 'INVALID_OPERATION',
} as const;

export type ShareErrorCode = typeof ShareErrorCodes[keyof typeof ShareErrorCodes];

export interface ErrorResponse {
    message: string;
    code: ShareErrorCode;
    details?: Record<string, unknown>;
}

export function handleShareError(error: unknown): HttpException {
    if (error instanceof ShareError) {
        const response: ErrorResponse = {
            message: error.message,
            code: error.code,
            details: error.details,
        };

        switch (error.statusCode) {
            case 400:
                return new BadRequestException(response);
            case 401:
                return new UnauthorizedException(response);
            case 403:
                return new ForbiddenException(response);
            case 404:
                return new NotFoundException(response);
            default:
                return new InternalServerErrorException(response);
        }
    }

    if (error instanceof HttpException) {
        return error;
    }

    const response: ErrorResponse = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: ShareErrorCodes.INTERNAL_ERROR,
    };

    return new InternalServerErrorException(response);
}

export function isShareError(error: unknown): error is ShareError {
    return error instanceof ShareError;
}

export function createShareError(error: unknown): ShareError {
    if (isShareError(error)) {
        return error;
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return ShareError.internal(message, ShareErrorCodes.INTERNAL_ERROR);
}
