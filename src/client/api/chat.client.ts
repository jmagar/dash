import { BaseApiClient, type Endpoint } from './base.client';
import { ApiError } from './api';
import type { 
  ChatMessage, 
  ChatResponse,
  ChatResponseData,
  ChatModelConfig,
} from '../../types/chat';
import { ChatRole } from '../../types/chat';

type ChatEndpoints = Record<string, Endpoint> & {
  SEND: '/api/chat';
};

const CHAT_ENDPOINTS: ChatEndpoints = {
  SEND: '/api/chat',
};

interface SendMessageOptions extends Partial<ChatModelConfig> {
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Chat client for sending and receiving chat messages.
 */
class ChatClient extends BaseApiClient<ChatEndpoints> {
  constructor() {
    super(CHAT_ENDPOINTS);
  }

  /**
   * Sends a chat message to the server.
   * 
   * @param message The message to send.
   * @param options Optional chat configuration.
   * @returns The server's response to the chat message.
   * @throws {ApiError} If the server's response is invalid or an error occurs.
   */
  async sendChatMessage(
    message: string, 
    options: SendMessageOptions = {}
  ): Promise<ChatResponse<ChatResponseData>> {
    const response = await this.post<ChatResponse<ChatResponseData>>(
      this.getEndpoint('SEND'),
      {
        role: ChatRole.USER,
        content: message,
        ...options
      }
    );

    if (!response.data) {
      throw new ApiError({
        message: 'Failed to send chat message',
        code: 'CHAT_SEND_FAILED'
      });
    }

    return response.data;
  }
}

// Create a single instance
const chatClient = new ChatClient();

// Export bound methods
export const { sendChatMessage } = chatClient;

// Export types from shared definitions
export type { ChatMessage, ChatResponse, ChatResponseData };
// Export the interface separately to avoid conflict
export type { SendMessageOptions };
