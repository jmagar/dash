import { api } from './api';
import { logger } from '../utils/frontendLogger';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

export async function sendChatMessage(
  message: string,
  options: {
    useMem0?: boolean;
    systemPrompt?: string;
  } = {}
): Promise<ChatResponse> {
  try {
    const metadata = {
      messageLength: message.length,
      useMem0: options.useMem0,
      hasSystemPrompt: !!options.systemPrompt,
    };
    logger.info('Sending chat message', metadata);

    const response = await api.post<ChatResponse>('/api/chat', {
      message,
      ...options,
    });

    logger.info('Chat message sent successfully', {
      ...metadata,
      responseLength: response.data?.data?.length || 0,
      usage: response.data?.usage,
    });

    return response.data;
  } catch (error) {
    const errorMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
      messageLength: message.length,
    };
    logger.error('Failed to send chat message:', errorMetadata);
    throw error;
  }
}
