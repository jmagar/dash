import { Request, Response } from 'express';

import { createApiError } from '../../types/error';
import { MemoryService } from '../memory/MemoryService';
import { generateCompletion, shouldUseOpenRouter } from '../services/llm';
import { logger } from '../utils/logger';

const memoryService = new MemoryService();

export async function generateChatResponse(req: Request, res: Response) {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      throw createApiError('Message and userId are required', null, 400);
    }

    // Get relevant memories
    const memories = await memoryService.searchMemories(userId, message);

    // Enhance prompt with memories
    const enhancedPrompt = `
Previous Context:
${memories.map(m => m.content).join('\n')}

Current Message:
${message}

Instructions:
- Use the previous context to provide a more personalized response
- Maintain consistency with past interactions
- If the context contains preferences or important details, incorporate them naturally
- Respond in a helpful and engaging manner
`;

    // Generate response using the appropriate service
    const useOpenRouter = shouldUseOpenRouter();
    const response = await generateCompletion(enhancedPrompt, useOpenRouter);

    // Store new memory
    await memoryService.addMemory(userId, message, response);

    logger.info('Chat response generated successfully', {
      userId,
      messageLength: message.length,
      responseLength: response.length,
      memoriesUsed: memories.length,
      provider: useOpenRouter ? 'OpenRouter' : 'OpenAI',
    });

    return res.json({ response });
  } catch (error) {
    logger.error('Failed to generate chat response:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getUserMemories(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw createApiError('UserId is required', null, 400);
    }

    const memories = await memoryService.getAllMemories(userId);

    logger.info('Retrieved user memories successfully', {
      userId,
      memoriesCount: memories.length,
    });

    return res.json({ memories });
  } catch (error) {
    logger.error('Failed to get user memories:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
