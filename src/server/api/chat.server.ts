import { Request, Response } from 'express';

import { MemoryService } from '../memory/MemoryService';
import { generateCompletion, shouldUseOpenRouter } from '../services/llm';
import { logger } from '../utils/logger';

interface ChatRequest {
  message: string;
  userId: string;
  model?: string;
}

interface ChatResponse {
  response: string;
}

interface GetMemoriesResponse {
  memories: unknown[];
}

const memoryService = new MemoryService();

export async function generateChatResponse(
  req: Request<unknown, ChatResponse | { error: string }, ChatRequest>,
  res: Response<ChatResponse | { error: string }>
): Promise<void> {
  try {
    const { message, userId, model } = req.body;

    // Verify user has access to this userId
    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        error: 'Unauthorized access',
      });
      return;
    }

    if (!message || !userId) {
      res.status(400).json({
        error: 'Message and userId are required',
      });
      return;
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
      model,
    });

    res.json({ response });
  } catch (error) {
    logger.error('Failed to generate chat response:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to generate response',
    });
  }
}

export async function getUserMemories(
  req: Request<{ userId: string }>,
  res: Response<GetMemoriesResponse | { error: string }>
): Promise<void> {
  try {
    const { userId } = req.params;

    // Verify user has access to this userId
    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        error: 'Unauthorized access',
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        error: 'UserId is required',
      });
      return;
    }

    const memories = await memoryService.getAllMemories(userId);

    logger.info('Retrieved user memories successfully', {
      userId,
      memoriesCount: memories.length,
    });

    res.json({ memories });
  } catch (error) {
    logger.error('Failed to get user memories:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Failed to get memories',
    });
  }
}
