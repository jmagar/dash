import { Router } from 'express';
import { chatService } from '../services/chat.service';
import { logger } from '../utils/logger';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, systemPrompt } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const response = await chatService.chat(message, { systemPrompt });

    res.json(response);
  } catch (error) {
    logger.error('Chat API error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
    });
  }
});

export default router;
