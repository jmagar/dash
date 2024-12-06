import { ApiResult } from './error';
import { LogMetadata } from './logger';

// Enums
export enum ChatRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function'
}

export enum ChatModel {
  GPT4 = 'gpt-4',
  GPT35_TURBO = 'gpt-3.5-turbo',
  CLAUDE = 'claude',
  LLAMA = 'llama'
}

// Message types
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  code?: string;
  language?: string;
  command?: string;
  metadata?: {
    userId?: string;
    sessionId?: string;
    threadId?: string;
    replyTo?: string;
    edited?: boolean;
    editedAt?: Date;
    [key: string]: unknown;
  };
}

export interface ChatResponseData {
  content: string;
  code?: string;
  language?: string;
  command?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ChatResponse<T = ChatResponseData> extends ApiResult<T> {
  metadata?: LogMetadata & {
    userId?: string;
    sessionId?: string;
    modelName?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latency?: number;
  };
}

// State and context types
export interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: ChatError | null;
}

export interface ChatStateDto {
  id: string;
  messages: ChatMessage[];
  context: ChatContext;
  metadata?: Record<string, unknown>;
}

export type CommandType = 'execute' | 'install' | 'update' | 'remove';

export interface ChatCommand {
  id: string;
  type: CommandType;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  sudo?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ChatContext {
  currentDirectory?: string;
  selectedFiles?: string[];
  selectedHost?: string;
  environmentVariables?: Record<string, string>;
  lastCommand?: ChatCommand;
  lastResult?: {
    success: boolean;
    output?: string;
    error?: string;
    exitCode?: number;
    duration?: number;
  };
  metadata?: Record<string, unknown>;
}

// Settings types
export interface ChatSettings {
  model: ChatModel;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stop?: string[];
  stream?: boolean;
}

// Error types
export interface ChatError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// DTO types
export interface ChatMessageDto {
  id?: string;
  role: ChatRole;
  content: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatSessionDto {
  id?: string;
  userId: string;
  title?: string;
  messages: ChatMessageDto[];
  context?: ChatContext;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatResponseDataDto {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}

// Pagination types
export interface PaginatedResponse<T> extends ApiResult<T[]> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Model configuration
export interface ChatModelConfig {
  model: ChatModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
}

// Constants
export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  model: ChatModel.GPT4,
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stream: false,
};

export const CHAT_ERROR_CODES = {
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  INVALID_COMMAND: 'INVALID_COMMAND',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  CONTEXT_ERROR: 'CONTEXT_ERROR',
  SETTINGS_ERROR: 'SETTINGS_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// Type guards
export function isChatMessage(obj: unknown): obj is ChatMessage {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'role' in obj &&
    'content' in obj &&
    'timestamp' in obj &&
    typeof (obj as ChatMessage).id === 'string' &&
    Object.values(ChatRole).includes((obj as ChatMessage).role) &&
    typeof (obj as ChatMessage).content === 'string' &&
    (obj as ChatMessage).timestamp instanceof Date;
}

export function isChatCommand(obj: unknown): obj is ChatCommand {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'type' in obj &&
    'command' in obj &&
    typeof (obj as ChatCommand).id === 'string' &&
    typeof (obj as ChatCommand).command === 'string' &&
    ['execute', 'install', 'update', 'remove'].includes((obj as ChatCommand).type);
}

export function isChatError(obj: unknown): obj is ChatError {
  return obj !== null &&
    typeof obj === 'object' &&
    'code' in obj &&
    'message' in obj &&
    typeof (obj as ChatError).code === 'string' &&
    typeof (obj as ChatError).message === 'string';
}

// Validation functions
export function validateChatSettings(settings: Partial<ChatSettings>): ChatSettings {
  return {
    model: settings.model ?? DEFAULT_CHAT_SETTINGS.model,
    temperature: clamp(settings.temperature ?? DEFAULT_CHAT_SETTINGS.temperature, 0, 1),
    maxTokens: clamp(settings.maxTokens ?? DEFAULT_CHAT_SETTINGS.maxTokens, 1, 4096),
    topP: clamp(settings.topP ?? DEFAULT_CHAT_SETTINGS.topP, 0, 1),
    frequencyPenalty: clamp(settings.frequencyPenalty ?? DEFAULT_CHAT_SETTINGS.frequencyPenalty, -2, 2),
    presencePenalty: clamp(settings.presencePenalty ?? DEFAULT_CHAT_SETTINGS.presencePenalty, -2, 2),
    stop: settings.stop,
    stream: settings.stream ?? DEFAULT_CHAT_SETTINGS.stream,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
