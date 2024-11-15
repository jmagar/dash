import type { Request, Response, NextFunction } from 'express';
import { createApiError } from '../../types/error';
import { logger } from '../utils/logger';

export function validateHostId(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) {
    const error = createApiError('Invalid host ID', null, 400);
    logger.warn('Invalid host ID provided', { id });
    res.status(400).json({
      success: false,
      error: error.message,
    });
    return;
  }
  next();
}

export function validateCreateHostRequest(req: Request, res: Response, next: NextFunction): void {
  const { name, hostname, port, username } = req.body;
  if (!name || !hostname || !port || !username) {
    const error = createApiError('Missing required fields', { body: req.body }, 400);
    logger.warn('Invalid host creation request', { body: req.body });
    res.status(400).json({
      success: false,
      error: error.message,
    });
    return;
  }
  next();
}

export function validateUpdateHostRequest(req: Request, res: Response, next: NextFunction): void {
  const { name, hostname, port, username } = req.body;
  if (!name && !hostname && !port && !username) {
    const error = createApiError('No fields to update', { body: req.body }, 400);
    logger.warn('Invalid host update request', { body: req.body });
    res.status(400).json({
      success: false,
      error: error.message,
    });
    return;
  }
  next();
}
