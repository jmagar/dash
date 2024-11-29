import { Request, Response } from 'express';
import { chatService } from '../../services/chat.service';
import { SendMessageDto } from './dto/chat.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiError } from '../../utils/error';
import { ApiResponse } from '../../types/express';
import { logger } from '../../utils/logger';

export const handleChatMessage = async (
  req: Request<Record<string, never>, any, SendMessageDto>,
  res: Response
): Promise<void> => {
  try {
    // Transform and validate request body
    const messageDto = plainToClass(SendMessageDto, req.body);
    const errors = await validate(messageDto);
    
    if (errors.length > 0) {
      throw new ApiError(400, 'Validation failed', errors);
    }

    const response = await chatService.processMessage(messageDto);
    res.json(new ApiResponse(response));
  } catch (error) {
    logger.error('Error in chat message handling:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Internal server error processing chat message');
  }
};
