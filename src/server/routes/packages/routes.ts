import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import { PackageParams, InstallPackageDto } from './dto/packages.dto';

const router = Router();

// List packages
router.get(
  '/:hostId',
  asyncAuthHandler<PackageParams>(controller.listPackages)
);

// Install package
router.post(
  '/:hostId/install',
  asyncAuthHandler<PackageParams, any, InstallPackageDto>(controller.installPackage)
);

export default router;
