import express, { Router } from 'express';

import hostsRouter from './hosts';
import { getStatus } from './status';

const router: Router = express.Router();

// Define status route first
router.get('/status', getStatus);

// Then mount the hosts router
router.use('/api/hosts', hostsRouter);

export default router;
