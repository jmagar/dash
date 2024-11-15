import { api } from './api';
import {
  DEFAULT_CHAT_SETTINGS,
  type ChatRequest,
  type ChatResponse,
  type ChatSessionResponse,
  type ChatSessionsResponse,
  type ChatSettings,
} from '../../types/chat';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/logger';

const CHAT_ENDPOINTS = {
  SEND: '/chat/send',
  SESSIONS: '/chat/sessions',
  SESSION: (id: string) => `/chat/sessions/${id}`,
  SETTINGS: '/chat/settings',
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
    throw createApiError('Failed to send chat message', error, 500);
  }
}

export async function getSessions(): Promise<ChatSessionsResponse> {
  try {
    logger.info('Fetching chat sessions');
    const response = await api.get<ChatSessionsResponse>(CHAT_ENDPOINTS.SESSIONS);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch sessions');
    }

    const sessions = response.data.data;
    if (!sessions) {
      throw new Error('No sessions data received');
    }

    logger.info('Chat sessions fetched successfully', {
      sessionCount: sessions.length,
    });

    return response.data;
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to fetch chat sessions:', metadata);
    throw createApiError('Failed to fetch chat sessions', error, 500);
  }
}

export async function getSession(id: string): Promise<ChatSessionResponse> {
  const metadata: LogMetadata = { sessionId: id };

  try {
    logger.info('Fetching chat session', metadata);
    const response = await api.get<ChatSessionResponse>(CHAT_ENDPOINTS.SESSION(id));

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch session');
    }

    const session = response.data.data;
    if (!session) {
      throw new Error('No session data received');
    }

    logger.info('Chat session fetched successfully', {
      ...metadata,
      messageCount: session.messages.length,
    });

    return response.data;
  } catch (error) {
    const errorMetadata: LogMetadata = {
      ...metadata,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to fetch chat session:', errorMetadata);
    throw createApiError('Failed to fetch chat session', error, 404);
  }
}

export async function updateSettings(settings: Partial<ChatSettings>): Promise<void> {
  try {
    logger.info('Updating chat settings', settings);
    await api.put(CHAT_ENDPOINTS.SETTINGS, settings);
    logger.info('Chat settings updated successfully');
  } catch (error) {
    const metadata: LogMetadata = {
      ...settings,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to update chat settings:', metadata);
    throw createApiError('Failed to update chat settings', error, 500);
  }
}
