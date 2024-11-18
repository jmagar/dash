import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from 'langchain/schema';
import config from '../config';
import { logger } from '../utils/logger';

interface ChatOptions {
  systemPrompt?: string;
}

interface ChatResponse {
  success: boolean;
  data?: string;
  error?: string;
}

class ChatService {
  private openai: ChatOpenAI;
  private defaultSystemPrompt = "You are a helpful assistant.";

  constructor() {
    this.openai = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.model,
      temperature: config.openai.temperature,
    });
  }

  private extractContent(message: AIMessage): string {
    const content = message.content;
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map(item => {
          if (typeof item === 'string') {
            return item;
          }
          // Handle other content types if needed
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    return '';
  }

  async chat(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
    try {
      // Build messages array
      const messages: BaseMessage[] = [
        new SystemMessage(options.systemPrompt || this.defaultSystemPrompt),
        new HumanMessage(message)
      ];

      // Get response from OpenAI
      const response = await this.openai.call(messages);
      const content = this.extractContent(response);

      return {
        success: true,
        data: content,
      };
    } catch (error) {
      logger.error('Chat service error:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'Failed to process chat message',
      };
    }
  }
}

export const chatService = new ChatService();
