import { Request, Response } from 'express';
import { conversationService } from '../../services/conversation.service';
import { SendMessageDto } from './dto/chat.dto';
import { ChatSettingsDto } from './dto/chat.dto'; // Assuming ChatSettingsDto is defined in the same file
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiError } from '../../utils/error';
import { ApiResponse } from '../../types/express';
import { logger } from '../../utils/logger';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

export const handleChatMessage = async (
  req: Request<Record<string, never>, any, SendMessageDto>,
  res: Response
): Promise<void> => {
  try {
    // Transform and validate request body
    const messageDto = plainToClass(SendMessageDto, req.body);
    const settingsDto = plainToClass(ChatSettingsDto, req.body.settings || {});
    const sessionId = req.session?.id || 'default';

    // Validate message DTO
    const errors = await validate(messageDto);
    if (errors.length > 0) {
      throw new ApiError('Invalid message format', 400, errors);
    }

    const response = await conversationService.chat(messageDto, settingsDto, sessionId);
    return res.json(new ApiResponse(response));
  } catch (error) {
    loggerLoggingManager.getInstance().();
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Internal server error processing chat message');
  }
};

export async function getChatHistory(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    const history = await conversationService.getConversationHistory(sessionId);
    return res.json(new ApiResponse(history));
  } catch (error) {
    loggerLoggingManager.getInstance().();
    if (error instanceof ApiError) {
      return res.status(error.status).json(new ApiResponse(null, error));
    }
    return res.status(500).json(new ApiResponse(null, new ApiError('Internal server error', 500)));
  }
}

export async function clearChatHistory(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      throw new ApiError('Session ID is required', 400);
    }

    await conversationService.clearHistory(sessionId);
    return res.json(new ApiResponse({ message: 'Chat history cleared successfully' }));
  } catch (error) {
    loggerLoggingManager.getInstance().();
    if (error instanceof ApiError) {
      return res.status(error.status).json(new ApiResponse(null, error));
    }
    return res.status(500).json(new ApiResponse(null, new ApiError('Internal server error', 500)));
  }
}

export async function streamChatMessage(req: Request, res: Response) {
  try {
    const messageDto = plainToClass(SendMessageDto, req.body);
    const settingsDto = plainToClass(ChatSettingsDto, req.body.settings || {});
    const sessionId = req.session?.id || 'default';

    // Validate message DTO
    const errors = await validate(messageDto);
    if (errors.length > 0) {
      throw new ApiError('Invalid message format', 400, errors);
    }

    // Start streaming response
    await conversationService.streamChat(messageDto, settingsDto, sessionId, res);
  } catch (error) {
    loggerLoggingManager.getInstance().();
    if (!res.headersSent) {
      if (error instanceof ApiError) {
        return res.status(error.status).json(new ApiResponse(null, error));
      }
      return res.status(500).json(new ApiResponse(null, new ApiError('Internal server error', 500)));
    }
  }
}

