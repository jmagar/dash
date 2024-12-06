import type { ChatMessage as BaseChatMessage, ChatModel as ChatModelType, ChatResponse, ChatResponseData } from './chat';

/**
 * Chat model service interface
 */
export interface ChatModel {
  /** Default model identifier */
  defaultModel: ChatModelType;
  
  /** Create a chat completion */
  createChatCompletion(params: ChatCompletionParams): Promise<ChatModelResult>;
  
  /** Get model configuration */
  getModelConfig(): ChatModelConfig;
  
  /** Set model configuration */
  setModelConfig(config: Partial<ChatModelConfig>): void;
}

/**
 * Parameters for creating a chat completion
 */
export interface ChatCompletionParams {
  /** Model identifier */
  model: ChatModelType;
  
  /** Array of chat messages */
  messages: ChatMessage[];
  
  /** Sampling temperature (0-1) */
  temperature?: number;
  
  /** Maximum tokens to generate */
  max_tokens?: number;
  
  /** Nucleus sampling parameter (0-1) */
  top_p?: number;
  
  /** Frequency penalty (-2 to 2) */
  frequency_penalty?: number;
  
  /** Presence penalty (-2 to 2) */
  presence_penalty?: number;
  
  /** Stop sequences */
  stop?: string[];
  
  /** Stream response */
  stream?: boolean;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  /** Message role (user, assistant, or system) */
  role: BaseChatMessage['role'];
  
  /** Message content */
  content: string;
  
  /** Optional name for the message sender */
  name?: string;
  
  /** Optional function call details */
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * Chat model result
 */
export interface ChatModelResult extends ChatResponse<ChatResponseData> {
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Chat model response
 */
export interface ChatModelResponse extends ChatResponseData {
  /** Model used for generation */
  model: string;
  
  /** Reason for completion */
  finish_reason: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
  
  /** Optional function call in response */
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * Chat model configuration
 */
export interface ChatModelConfig {
  /** Model identifier */
  model: ChatModelType;
  
  /** Temperature for sampling */
  temperature: number;
  
  /** Maximum tokens to generate */
  maxTokens: number;
  
  /** Top-p sampling parameter */
  topP: number;
  
  /** Frequency penalty */
  frequencyPenalty: number;
  
  /** Presence penalty */
  presencePenalty: number;
  
  /** Stop sequences */
  stop?: string[];
  
  /** Stream response */
  stream?: boolean;
  
  /** Rate limiting configuration */
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

// Constants
export const CHAT_MODEL_DEFAULTS = {
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  stream: false,
} as const;

// Type guards
export function isChatMessage(obj: unknown): obj is ChatMessage {
  return obj !== null &&
    typeof obj === 'object' &&
    'role' in obj &&
    'content' in obj &&
    typeof (obj as ChatMessage).content === 'string';
}

export function isChatModelResponse(obj: unknown): obj is ChatModelResponse {
  return obj !== null &&
    typeof obj === 'object' &&
    'content' in obj &&
    'model' in obj &&
    'usage' in obj &&
    'finish_reason' in obj;
}

// Validation functions
export function validateCompletionParams(params: Partial<ChatCompletionParams>): ChatCompletionParams {
  if (!params.model) {
    throw new Error('Model is required');
  }
  
  if (!params.messages?.length) {
    throw new Error('At least one message is required');
  }
  
  return {
    model: params.model,
    messages: params.messages,
    temperature: clamp(params.temperature ?? CHAT_MODEL_DEFAULTS.temperature, 0, 1),
    max_tokens: clamp(params.max_tokens ?? CHAT_MODEL_DEFAULTS.max_tokens, 1, 4096),
    top_p: clamp(params.top_p ?? CHAT_MODEL_DEFAULTS.top_p, 0, 1),
    frequency_penalty: clamp(params.frequency_penalty ?? CHAT_MODEL_DEFAULTS.frequency_penalty, -2, 2),
    presence_penalty: clamp(params.presence_penalty ?? CHAT_MODEL_DEFAULTS.presence_penalty, -2, 2),
    stop: params.stop,
    stream: params.stream ?? CHAT_MODEL_DEFAULTS.stream,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
