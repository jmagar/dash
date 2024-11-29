import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import { CompressFilesDto, DecompressFileDto } from './dto/compression.dto';

const router = Router();

// Compress files
router.post(
  '/compress',
  asyncAuthHandler<Record<string, never>, any, CompressFilesDto>(
    controller.compressFiles
  )
);

// Decompress file
router.post(
  '/decompress',
  asyncAuthHandler<Record<string, never>, any, DecompressFileDto>(
    controller.decompressFile
  )
);

export default router;
