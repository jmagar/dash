export class ApiError extends Error {
  status: number;
  details?: Record<string, unknown>[];

  constructor(message, status = 500, details?) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message, details?) {
    return new ApiError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized', details?) {
    return new ApiError(message, 401, details);
  }

  static forbidden(message = 'Forbidden', details?) {
    return new ApiError(message, 403, details);
  }

  static notFound(message = 'Not Found', details?) {
    return new ApiError(message, 404, details);
  }

  static tooManyRequests(message = 'Too Many Requests', details?) {
    return new ApiError(message, 429, details);
  }

  static internal(message = 'Internal Server Error', details?) {
    return new ApiError(message, 500, details);
  }
}
