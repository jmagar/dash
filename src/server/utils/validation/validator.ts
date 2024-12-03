import { z } from 'zod';
import { createValidationError } from '../error/errorHandler';

/**
 * Generic validation function that uses Zod schemas
 */
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError('Validation failed', {
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      });
    }
    throw error;
  }
}

/**
 * Safe validation that returns a Result type instead of throwing
 */
export function validateSafe<T>(
  schema: z.ZodType<T>,
  value: unknown
): z.SafeParseReturnType<unknown, T> {
  return schema.safeParse(value);
}

/**
 * Validate multiple values against their schemas
 */
export function validateBatch<T extends Record<string, z.ZodType>>(
  schemas: T,
  values: Record<keyof T, unknown>
): { [K in keyof T]: z.infer<T[K]> } {
  const result: Record<string, unknown> = {};
  const errors: Record<string, z.ZodError> = {};

  for (const [key, schema] of Object.entries(schemas)) {
    const parseResult = schema.safeParse(values[key]);
    if (parseResult.success) {
      result[key] = parseResult.data;
    } else {
      errors[key] = parseResult.error;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw createValidationError('Batch validation failed', { errors });
  }

  return result as { [K in keyof T]: z.infer<T[K]> };
}

/**
 * Create a branded type validator
 */
export function createBrandedTypeValidator<Brand extends string>(
  baseSchema: z.ZodType,
  brand: Brand
) {
  return baseSchema.brand<Brand>();
}

/**
 * Validate an ID format (UUID v4)
 */
export const validateId = (value: unknown): string => {
  const uuidSchema = z.string().uuid();
  return validate(uuidSchema, value);
};
