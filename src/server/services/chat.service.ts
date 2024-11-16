import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import { Mem0Client } from 'mem0ai';
import { config } from '../config';
import { logger } from '../utils/logger';

interface ChatOptions {
  useMem0?: boolean;
  systemPrompt?: string;
}

class ChatService {
  private openai: ChatOpenAI;
  private mem0: Mem0Client;

  constructor() {
    this.openai = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.model,
      temperature: 0.7,
    });

    this.mem0 = new Mem0Client({
      apiKey: config.mem0.apiKey,
    });
  }

  async chat(message: string, options: ChatOptions = {}) {
    try {
      // If mem0 is enabled, get context from it
      let context = '';
      if (options.useMem0) {
        const memories = await this.mem0.search(message);
        context = memories.map(m => m.content).join('\n');
      }

      // Build messages array
      const messages = [
        new SystemMessage(options.systemPrompt || config.openai.systemPrompt),
      ];

      // Add context if we have it
      if (context) {
        messages.push(new SystemMessage(`Additional Context:\n${context}`));
      }

      // Add user message
      messages.push(new HumanMessage(message));

      // Get response from OpenAI
      const response = await this.openai.call(messages);

      // If mem0 is enabled, store the interaction
      if (options.useMem0) {
        await this.mem0.store({
          content: `User: ${message}\nAssistant: ${response.content}`,
          metadata: {
            type: 'chat',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return {
        success: true,
        data: response.content,
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
