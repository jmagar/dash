import { Router } from 'express';
import authRoutes from './auth/routes';
import hostRoutes from './hosts/routes';
import dockerRoutes from './docker/routes';
import fileRoutes from './files/routes';
import packageRoutes from './packages/routes';
import notificationRoutes from './notifications/routes';
import bookmarkRoutes from './bookmarks/routes';
import preferencesRoutes from './preferences/routes';
import chatRoutes from './chat/routes';
import compressionRoutes from './compression/routes';
import statusRoutes from './status/routes';
import testRoutes from './test/routes';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/test', testRoutes);
router.use('/status', statusRoutes);

// Protected routes - all require authentication
router.use('/hosts', requireAuth, hostRoutes);
router.use('/docker', requireAuth, dockerRoutes);
router.use('/files', requireAuth, fileRoutes);
router.use('/packages', requireAuth, packageRoutes);
router.use('/notifications', requireAuth, notificationRoutes);
router.use('/bookmarks', requireAuth, bookmarkRoutes);
router.use('/preferences', requireAuth, preferencesRoutes);
router.use('/chat', requireAuth, chatRoutes);
router.use('/compression', requireAuth, compressionRoutes);

export default router;
