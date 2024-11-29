import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import { FileParams } from './dto/files.dto';

const router = Router();

// List files in directory
router.get(
  '/:hostId',
  asyncAuthHandler<FileParams>(controller.listFiles)
);

export default router;
