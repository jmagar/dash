declare module '@copilotkit/react-core' {
  import type { Message } from '@copilotkit/shared';
  import type { ReactNode } from 'react';

  export interface UseCopilotChatOptions {
    id: string;
    onError?: (error: unknown) => void;
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
  }

  export interface CopilotApiConfig {
    chatApiEndpoint: string;
    headers: Record<string, string>;
    params?: Record<string, unknown>;
  }

  export interface CopilotKitProps {
    children: ReactNode;
    apiConfig?: CopilotApiConfig;
  }

  export const useCopilotChat: (options: UseCopilotChatOptions) => UseCopilotChatReturn;
  export const CopilotKit: (props: CopilotKitProps) => JSX.Element;
}

declare module '@copilotkit/shared' {
  export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }

  export interface MessageContentComplex {
    type: string;
    text: string;
  }

  export type MessageContent = string | MessageContentComplex[];

  export interface ChatResponse {
    success: boolean;
    data?: string;
    error?: string;
  }
}
