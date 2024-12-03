import { Router } from 'express';
import { rateLimiter } from '../../middleware/rateLimiter';
import { handleChatMessage, getChatHistory, clearChatHistory, streamChatMessage } from './controller';

const router = Router();

// Apply rate limiting to all chat routes
router.use(rateLimiter.middleware.bind(rateLimiter));

// Chat routes
router.post('/message', handleChatMessage);
router.post('/stream', streamChatMessage);
router.get('/history/:sessionId', getChatHistory);
router.delete('/history/:sessionId', clearChatHistory);

export default router;
