/**
 * Base error class for all service-related errors
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a service operation fails
 */
export class ServiceOperationError extends ServiceError {
  constructor(
    message: string,
    public readonly operation: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_OPERATION_ERROR', {
      ...details,
      operation,
    });
  }
}

/**
 * Error thrown when a service is in an invalid state for an operation
 */
export class ServiceStateError extends ServiceError {
  constructor(
    message: string,
    public readonly currentState: string,
    public readonly expectedState: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_STATE_ERROR', {
      ...details,
      currentState,
      expectedState,
    });
  }
}

/**
 * Error thrown when a service dependency is missing or invalid
 */
export class ServiceDependencyError extends ServiceError {
  constructor(
    message: string,
    public readonly dependencyName: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_DEPENDENCY_ERROR', {
      ...details,
      dependencyName,
    });
  }
}

/**
 * Error thrown when a service configuration is invalid
 */
export class ServiceConfigurationError extends ServiceError {
  constructor(
    message: string,
    public readonly configKey: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_CONFIGURATION_ERROR', {
      ...details,
      configKey,
    });
  }
}

/**
 * Error thrown when a service timeout occurs
 */
export class ServiceTimeoutError extends ServiceError {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly timeoutMs: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_TIMEOUT_ERROR', {
      ...details,
      operation,
      timeoutMs,
    });
  }
}

/**
 * Error thrown when a service validation fails
 */
export class ServiceValidationError extends ServiceError {
  constructor(
    message: string,
    public readonly validationType: string,
    public readonly validationErrors: string[],
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_VALIDATION_ERROR', {
      ...details,
      validationType,
      validationErrors,
    });
  }
}

/**
 * Error thrown when a service communication fails
 */
export class ServiceCommunicationError extends ServiceError {
  constructor(
    message: string,
    public readonly targetService: string,
    public readonly operation: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_COMMUNICATION_ERROR', {
      ...details,
      targetService,
      operation,
    });
  }
}

/**
 * Error thrown when a service resource is not found
 */
export class ServiceNotFoundError extends ServiceError {
  constructor(
    message: string,
    public readonly resourceType: string,
    public readonly resourceId: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_NOT_FOUND_ERROR', {
      ...details,
      resourceType,
      resourceId,
    });
  }
}

/**
 * Error thrown when a service operation is not permitted
 */
export class ServicePermissionError extends ServiceError {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly requiredPermission: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_PERMISSION_ERROR', {
      ...details,
      operation,
      requiredPermission,
    });
  }
}
