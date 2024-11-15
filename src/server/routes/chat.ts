import express from 'express';
import { generateChatResponse, getSessions, getSession } from '../api/chat.server';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all chat routes
router.use(authenticateToken);

router.post('/send', generateChatResponse);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);

export default router;
