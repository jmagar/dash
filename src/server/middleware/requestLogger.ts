import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { LoggingManager } from '../managers/utils/LoggingManager';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  req.requestId = uuidv4();

  res.on('finish', () => {
    const duration = Date.now() - start;
    LoggingManager.getInstance().info('Request processed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });

  next();
};


