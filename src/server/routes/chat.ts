import express from 'express';
import { generateChatResponse } from '../api/chat.server';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all chat routes
router.use(authenticateToken);

// Main chat endpoint that handles both CopilotKit and mem0ai
router.post('/', generateChatResponse);

export default router;
