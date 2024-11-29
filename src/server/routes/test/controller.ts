import { Request, Response } from 'express';
import { ApiError } from '../../utils/error';
import { ApiResponse } from '../../types/express';
import { logger } from '../../utils/logger';

export const testRoute = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const metadata = {
      method: req.method,
      path: req.path,
    };
    logger.info('Test route accessed:', metadata);

    res.json(new ApiResponse({
      success: true,
      message: 'Test route working'
    }));
  } catch (error) {
    logger.error('Error in test route:', error);
    throw new ApiError(500, 'Test route error');
  }
};
