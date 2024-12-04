import { Request, Response } from 'express';
import { ApiError } from '../../utils/error';
import { ApiResponse } from '../../types/express';
import { logger } from '../../utils/logger';
import { LoggingManager } from '../../managers/utils/LoggingManager';

export const testRoute = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const metadata = {
      method: req.method,
      path: req.path,
    };
    loggerLoggingManager.getInstance().();

    res.json(new ApiResponse({
      success: true,
      message: 'Test route working'
    }));
  } catch (error) {
    loggerLoggingManager.getInstance().();
    throw new ApiError(500, 'Test route error');
  }
};


