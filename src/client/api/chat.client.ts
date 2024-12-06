import { BaseApiClient, type Endpoint } from './base.client';

// Basic types until we create proper shared DTOs
interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface ChatResponse {
  message: ChatMessage;
  success: boolean;
  error?: string;
}

interface ChatOptions {
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  model?: string;
  temperature?: number;
}

type ChatEndpoints = Record<string, Endpoint> & {
  SEND: '/api/chat';
};

const CHAT_ENDPOINTS: ChatEndpoints = {
  SEND: '/api/chat',
};

/**
 * Chat client for sending and receiving chat messages.
 */
class ChatClient extends BaseApiClient<ChatEndpoints> {
  /**
   * Creates a new instance of the chat client.
   */
  constructor() {
    super(CHAT_ENDPOINTS);
  }

  /**
   * Sends a chat message to the server.
   * 
   * @param message The message to send.
   * @param options Optional chat options.
   * @returns The server's response to the chat message.
   * @throws {Error} If the server's response is null.
   */
  async sendChatMessage(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const response = await this.post<ChatResponse>(
      this.getEndpoint('SEND'),
      { message, ...options }
    );

    if (!response.data) {
      throw new Error('Failed to send chat message');
    }

    return response.data;
  }
}

// Create a single instance
const chatClient = new ChatClient();

// Export bound methods
export const { sendChatMessage } = chatClient;

// Export types for external use
export type { ChatMessage, ChatResponse, ChatOptions };
