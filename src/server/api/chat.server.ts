import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { logger } from '../utils/logger';

interface ChatRequest {
  message: string;
  systemPrompt?: string;
  useMem0?: boolean;
}

interface ChatResponse {
  success: boolean;
  data?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateChatResponse(
  req: Request<unknown, ChatResponse, ChatRequest>,
  res: Response<ChatResponse>
): Promise<void> {
  try {
    const { message, systemPrompt, useMem0 } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    const response = await chatService.chat(message, {
      systemPrompt,
      useMem0,
    });

    res.json(response);
  } catch (error) {
    logger.error('Chat generation error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to generate chat response',
    });
  }
}
