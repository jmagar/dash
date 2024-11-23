import { Router } from 'express';
import { chatService } from '../services/chat.service';
import { logger } from '../utils/logger';
import { SendMessageDto, ChatMessageDto, ChatSettingsDto } from '../routes/chat/dto/chat.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    // Transform and validate request body using SendMessageDto
    const messageDto = plainToClass(SendMessageDto, req.body);
    const errors = await validate(messageDto);
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Create settings DTO with defaults if not provided
    const settingsDto = plainToClass(ChatSettingsDto, {
      temperature: req.body.temperature,
      maxTokens: req.body.maxTokens,
      systemPrompt: req.body.systemPrompt,
    });

    const response = await chatService.chat(messageDto, settingsDto);
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
