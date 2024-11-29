import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import { SendMessageDto } from './dto/chat.dto';

const router = Router();

// Main chat endpoint that handles both CopilotKit and mem0ai
router.post('/chat', asyncAuthHandler<Record<string, never>, any, SendMessageDto>(
  controller.handleChatMessage
));

export default router;
