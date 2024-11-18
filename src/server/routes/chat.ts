import express from 'express';
import chatRouter from '../api/chat.server';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all chat routes
router.use(authenticateToken);

// Main chat endpoint that handles both CopilotKit and mem0ai
router.use('/', chatRouter);

export default router;
