import { BaseApiClient } from './base.client';

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

interface ChatOptions {
  useMem0?: boolean;
  systemPrompt?: string;
}

const CHAT_ENDPOINTS = {
  SEND: '/api/chat',
} as const;

class ChatClient extends BaseApiClient {
  constructor() {
    super(CHAT_ENDPOINTS);
  }

  async sendChatMessage(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const metadata = {
      messageLength: message.length,
      useMem0: options.useMem0,
      hasSystemPrompt: !!options.systemPrompt,
    };

    const response = await this.post<ChatResponse>(this.getEndpoint('SEND'), {
      message,
      ...options,
    });

    return response.data;
  }
}

export const chatClient = new ChatClient();
export const { sendChatMessage } = chatClient;
