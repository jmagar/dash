import { ApiError } from '../../types/error';
import { logRouteAccess } from '../routeUtils';

export interface ErrorContext {
  code?: string;
  userId?: string;
  operation?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

export class ErrorHandler {
  static handle(error: Error | ApiError | unknown, context: ErrorContext = {}): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorDetails = error instanceof ApiError ? error.details : undefined;

    const metadata = {
      error: errorMessage,
      stack: errorStack,
      details: errorDetails,
      ...context
    };

    logRouteAccess('Error occurred:', metadata);
  }

  static createApiError(message: string, statusCode = 500, context?: ErrorContext): ApiError {
    return new ApiError(message, statusCode, context);
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  static getStatusCode(error: Error | ApiError | unknown): number {
    if (error instanceof ApiError) {
      return error.statusCode;
    }
    return 500;
  }
}
