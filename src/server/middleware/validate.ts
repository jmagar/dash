import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/errors';
import { monitoringService } from '../services/monitoring';
import { Constructor } from '../types/common.dto';

/**
 * Validation middleware factory
 * @param type The DTO class to validate against
 * @param skipMissingProperties Whether to skip validation of missing properties
 */
export function validateDto<T extends object>(type: Constructor<T>, skipMissingProperties = false) {
  return async (req: Request & { validatedData?: T }, res: Response, next: NextFunction) => {
    try {
      const dtoObj = plainToInstance(type, req.body);
      const errors = await validate(dtoObj, { skipMissingProperties });

      if (errors.length > 0) {
        const details = errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
          code: 'VALIDATION_ERROR'
        }));

        // Update monitoring for validation errors
        void monitoringService.updateServiceStatus('api', {
          name: 'api',
          status: 'degraded',
          error: 'Validation errors detected',
          lastCheck: new Date(),
          metadata: {
            endpoint: req.path,
            validationErrors: details
          }
        });

        throw ApiError.badRequest('Validation failed', details);
      }

      // Add validated data to request
      req.validatedData = dtoObj as T;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(ApiError.badRequest('Invalid request data'));
      }
    }
  };
}

/**
 * Query parameter validation middleware factory
 */
export function validateQuery<T extends object>(type: Constructor<T>) {
  return async (req: Request & { validatedQuery?: T }, res: Response, next: NextFunction) => {
    try {
      const queryObj = plainToInstance(type, req.query);
      const errors = await validate(queryObj);

      if (errors.length > 0) {
        const details = errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
          code: 'VALIDATION_ERROR'
        }));

        throw ApiError.badRequest('Query validation failed', details);
      }

      // Add validated query to request
      req.validatedQuery = queryObj as T;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(ApiError.badRequest('Invalid query parameters'));
      }
    }
  };
}
