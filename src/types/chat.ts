import type { ApiResponse } from './models-shared';
import type { LogMetadata } from './logger';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: LogMetadata;
}

export interface ChatRequest {
  message: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  metadata?: LogMetadata;
}

export interface ChatResponseData {
  message: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: LogMetadata;
}

export type ChatResponse = ApiResponse<ChatResponseData>;

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  model: string;
  metadata?: LogMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSettings {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  model: 'openai/gpt-3.5-turbo',
  maxTokens: 1000,
  temperature: 0.7,
};

export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 4000 },
  { id: 'openai/gpt-4', name: 'GPT-4', maxTokens: 8000 },
  { id: 'anthropic/claude-2', name: 'Claude 2', maxTokens: 100000 },
] as const;

export type ChatSessionResponse = ApiResponse<ChatSession>;
export type ChatSessionsResponse = ApiResponse<ChatSession[]>;

export interface ChatError {
  code: string;
  message: string;
  details?: unknown;
}
