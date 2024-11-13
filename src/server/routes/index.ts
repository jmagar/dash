import express from 'express';

import testRoutes from './test';

const router = express.Router();

// Mount routes
router.use('/test', testRoutes);

// Add more route modules here as needed
// router.use('/auth', authRoutes);
// router.use('/api', apiRoutes);
// etc.

export default router;
