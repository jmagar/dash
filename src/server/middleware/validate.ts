import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../types/errors';
import { monitoringService } from '../services/monitoring';
import { Constructor } from '../types/common.dto';
import { LoggingManager } from '../managers/utils/LoggingManager';

const logger = LoggingManager.getInstance();

export type ValidationSchema<T> = Constructor<T> | AnyZodObject;

interface ValidationOptions {
  skipMissingProperties?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
}

/**
 * Unified validation middleware factory
 * Supports both class-validator and Zod schemas
 */
export function validate<T extends object>(
  schema: ValidationSchema<T>,
  options: ValidationOptions = {}
) {
  return async (req: Request & { validatedData?: T }, res: Response, next: NextFunction) => {
    try {
      let validatedData: T;

      // Class-validator
      if (typeof schema === 'function') {
        const dtoObj = plainToInstance(schema, req.body);
        const errors = await validate(dtoObj, {
          skipMissingProperties: options.skipMissingProperties,
          whitelist: options.whitelist,
          forbidNonWhitelisted: options.forbidNonWhitelisted
        });

        if (errors.length > 0) {
          const details = errors.map(error => ({
            field: error.property,
            message: Object.values(error.constraints || {}).join(', '),
            code: 'VALIDATION_ERROR'
          }));

          throw ApiError.badRequest('Validation failed', details);
        }

        validatedData = dtoObj ;
      }
      // Zod
      else {
        const result = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });

        validatedData = result.body;
      }

      // Add validated data to request
      req.validatedData = validatedData;
      next();
    } catch (error) {
      // Log validation error
      logger.warn('Validation error:', {
        path: req.path,
        errors: error instanceof ZodError ? error.errors : error
      });

      // Update monitoring
      void monitoringService.updateServiceStatus('api', {
        name: 'api',
        status: 'degraded',
        error: 'Validation errors detected',
        lastCheck: new Date(),
        metadata: {
          endpoint: req.path,
          validationErrors: error instanceof ZodError ? error.errors : error
        }
      });

      if (error instanceof ApiError) {
        next(error);
      } else if (error instanceof ZodError) {
        next(ApiError.badRequest('Validation error', error.errors));
      } else {
        next(ApiError.badRequest('Invalid request data'));
      }
    }
  };
}

/**
 * Convenience wrapper for validating query parameters
 */
export function validateQuery<T extends object>(schema: ValidationSchema<T>, options?: ValidationOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Temporarily move query params to body for validation
    const originalBody = req.body;
    req.body = req.query;

    await validate(schema, options)(req, res, (err?: Error) => {
      // Restore original body
      req.body = originalBody;
      next(err);
    });
  };
}

