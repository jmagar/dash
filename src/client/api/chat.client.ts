import { api } from './api';
import {
  DEFAULT_CHAT_SETTINGS,
  type ChatResponse,
  type ChatSettings,
} from '../../types/chat';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

const CHAT_ENDPOINTS = {
  SEND: '/chat/send',
} as const;

export async function sendMessage(
  message: string,
  settings: Partial<ChatSettings> = {}
): Promise<ChatResponse> {
  const metadata: LogMetadata = {
    messageLength: message.length,
    model: settings.model || DEFAULT_CHAT_SETTINGS.model,
  };

  try {
    logger.info('Sending chat message', metadata);

    const response = await api.post<ChatResponse>(CHAT_ENDPOINTS.SEND, {
      message,
      model: settings.model || DEFAULT_CHAT_SETTINGS.model,
      maxTokens: settings.maxTokens || DEFAULT_CHAT_SETTINGS.maxTokens,
      temperature: settings.temperature || DEFAULT_CHAT_SETTINGS.temperature,
      systemPrompt: settings.systemPrompt,
      metadata,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send message');
    }

    const responseData = response.data.data;
    if (!responseData) {
      throw new Error('No response data received');
    }

    logger.info('Chat message sent successfully', {
      ...metadata,
      tokens: responseData.usage.totalTokens,
    });

    return response.data;
  } catch (error) {
    const errorMetadata: LogMetadata = {
      ...metadata,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to send chat message:', errorMetadata);
    throw createApiError('Failed to send chat message', error);
  }
}
