import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { ApiError } from '../../types/error';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        LoggingManager.getInstance().warn('Validation error:', {
          path: req.path,
          errors: error.errors,
        });
        next(new ApiError('Validation error', error.errors));
      } else {
        next(error);
      }
    }
  };
};

