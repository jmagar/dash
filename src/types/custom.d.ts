declare module '@copilotkit/react-core' {
  import type { Message, ChatResponse } from '@copilotkit/shared';
  import type { ReactNode } from 'react';

  export interface UseCopilotChatOptions {
    id: string;
    onError?: (error: Error) => void;
    onResponse?: (response: ChatResponse) => void;
    initialMessages?: Message[];
    maxMessages?: number;
  }

  export interface UseCopilotChatReturn {
    visibleMessages: Message[];
    append: (message: Message) => Promise<void>;
    isLoading: boolean;
    input: string;
    setInput: (value: string) => void;
    stop: () => void;
    clearMessages: () => void;
    error?: Error;
    reset: () => void;
    sendMessage: (content: string) => Promise<void>;
  }

  export interface CopilotApiConfig {
    chatApiEndpoint: string;
    headers: Record<string, string>;
    params?: Record<string, unknown>;
    timeout?: number;
    retries?: number;
  }

  export interface CopilotKitProps {
    children: ReactNode;
    apiConfig?: CopilotApiConfig;
    theme?: 'light' | 'dark' | 'auto';
    defaultLanguage?: string;
    enableMarkdown?: boolean;
  }

  export const useCopilotChat: (options: UseCopilotChatOptions) => UseCopilotChatReturn;
  export const CopilotKit: (props: CopilotKitProps) => JSX.Element;
}

declare module '@copilotkit/shared' {
  export type MessageRole = 'user' | 'assistant' | 'system';
  export type MessageType = 'text' | 'code' | 'image' | 'file';

  export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    type?: MessageType;
    metadata?: Record<string, unknown>;
    timestamp?: Date;
  }

  export interface MessageContentComplex {
    type: MessageType;
    text: string;
    language?: string;
    metadata?: Record<string, unknown>;
  }

  export type MessageContent = string | MessageContentComplex[];

  export interface ChatResponse {
    success: boolean;
    data?: string;
    error?: string;
    metadata?: {
      timestamp: Date;
      processingTime?: number;
      modelName?: string;
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    };
  }

  export interface ChatError extends Error {
    code: string;
    details?: Record<string, unknown>;
  }
}
