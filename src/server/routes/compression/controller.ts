import { Request, Response } from 'express';
import { compressionService } from '../../services/compression.service';
import { CompressFilesDto, DecompressFileDto } from './dto/compression.dto';
import { ApiError } from '../../utils/error';
import { LoggingManager } from '../../managers/LoggingManager';

export const compressFiles = async (
  req: Request<Record<string, never>, any, CompressFilesDto>,
  res: Response
): Promise<void> => {
  const { hostId, sourcePaths, targetPath } = req.body;

  const logger = LoggingManager.getInstance();
  logger.info('Compressing files', {
    hostId,
    sourcePaths,
    targetPath
  });

  const result = await compressionService.compressFiles(hostId, sourcePaths, targetPath);
  res.json({ success: true, data: result });
};

export const decompressFile = async (
  req: Request<Record<string, never>, any, DecompressFileDto>,
  res: Response
): Promise<void> => {
  const { hostId, sourcePath, targetPath } = req.body;

  const logger = LoggingManager.getInstance();
  logger.info('Decompressing file', {
    hostId,
    sourcePath,
    targetPath
  });

  const result = await compressionService.compressFiles(hostId, [sourcePath], targetPath);
  res.json({ success: true, data: result });
};
