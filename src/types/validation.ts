import { ServiceError } from './errors';

/**
 * Base interface for validation results
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
}

/**
 * Interface for validation errors
 */
export interface ValidationError {
  code: string;
  message: string;
  path?: string[];
  details?: Record<string, unknown>;
}

/**
 * Interface for validation options
 */
export interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  recursive?: boolean;
}

/**
 * Interface for validators
 */
export interface IValidator<T = unknown> {
  validate(value: unknown, options?: ValidationOptions): Promise<ValidationResult>;
  isValid(value: unknown): Promise<boolean>;
}

/**
 * Type for validation rules
 */
export type ValidationRule<T = unknown> = {
  validate: (value: T) => Promise<boolean> | boolean;
  message: string;
  code: string;
};

/**
 * Interface for validation context
 */
export interface ValidationContext {
  path: string[];
  value: unknown;
  root: unknown;
  options?: ValidationOptions;
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ServiceError {
  constructor(
    message: string,
    public readonly errors: ValidationError[],
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', {
      ...details,
      errors,
    });
  }
}
