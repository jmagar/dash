export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  code?: string;
  language?: string;
  command?: string;
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
}

export interface ChatResponse {
  success: boolean;
  data?: ChatResponseData;
  error?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
}

export interface ChatCommand {
  type: 'execute' | 'install' | 'update' | 'remove';
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
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
  };
}

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stop?: string[];
  stream?: boolean;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stream: false,
};
