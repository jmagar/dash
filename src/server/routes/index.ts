import { Router } from 'express';
import authRoutes from './auth';
import hostRoutes from './hosts';
import dockerRoutes from './docker';
import fileRoutes from './files';
import packageRoutes from './packages';
import notificationRoutes from './notifications';
import bookmarkRoutes from './bookmarks';
import preferencesRoutes from './preferences';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/hosts', requireAuth, hostRoutes);
router.use('/docker', requireAuth, dockerRoutes);
router.use('/files', requireAuth, fileRoutes);
router.use('/packages', requireAuth, packageRoutes);
router.use('/notifications', requireAuth, notificationRoutes);
router.use('/bookmarks', requireAuth, bookmarkRoutes);
router.use('/api/preferences', preferencesRoutes);

export default router;
