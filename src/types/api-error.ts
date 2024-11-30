export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, statusCode: number, context?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    context?: Record<string, unknown>;
  };
}
