/**
 * Custom error class for API-related errors with status code and context.
 * @extends Error
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;
  public readonly name = 'ApiError';

  /**
   * Creates a new ApiError instance.
   * @param message - Error message describing what went wrong
   * @param statusCode - HTTP status code associated with the error
   * @param context - Optional additional context about the error
   */
  constructor(message: string, statusCode: number, context?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Standard API response format with generic data type.
 * @template T - Type of the response data
 */
export interface ApiResponse<T = unknown> {
  /** Indicates if the API request was successful */
  success: boolean;
  /** Response data when success is true */
  data?: T;
  /** Error information when success is false */
  error?: {
    /** Error message describing what went wrong */
    message: string;
    /** Optional error code for more specific error handling */
    code?: string;
    /** Optional additional context about the error */
    context?: Record<string, unknown>;
  };
}
