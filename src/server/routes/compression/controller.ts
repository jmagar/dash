import { Request, Response } from 'express';
import { compressionService } from '../../services/compression.service';
import { CompressFilesDto, DecompressFileDto } from './dto/compression.dto';
import { ApiError } from '../../utils/error';
import { ApiResponse } from '../../types/express';
import { logger } from '../../utils/logger';

export const compressFiles = async (
  req: Request<Record<string, never>, any, CompressFilesDto>,
  res: Response
): Promise<void> => {
  const { hostId, sourcePaths, targetPath } = req.body;

  logger.info('Compressing files:', {
    userId: req.user!.id,
    hostId,
    sourcePaths,
    targetPath,
  });

  const result = await compressionService.compressFiles(hostId, sourcePaths, targetPath);
  res.json(new ApiResponse(result));
};

export const decompressFile = async (
  req: Request<Record<string, never>, any, DecompressFileDto>,
  res: Response
): Promise<void> => {
  const { hostId, sourcePath, targetPath } = req.body;

  logger.info('Decompressing file:', {
    userId: req.user!.id,
    hostId,
    sourcePath,
    targetPath,
  });

  const result = await compressionService.decompressFile(hostId, sourcePath, targetPath);
  res.json(new ApiResponse(result));
};
