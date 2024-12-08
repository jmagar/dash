import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from 'langchain/schema';
import config from '../config';
import { LoggingManager } from '../managers/LoggingManager';
import { SendMessageDto, ChatMessageDto, ChatSettingsDto, ChatRole } from '../routes/chat/dto/chat.dto';
import { plainToClass } from 'class-transformer';

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

  async chat(messageDto: SendMessageDto, settingsDto: ChatSettingsDto): Promise<ChatMessageDto> {
    try {
      // Configure OpenAI with settings
      this.openai.temperature = settingsDto.temperature || config.openai.temperature;
      if (settingsDto.maxTokens) {
        this.openai.maxTokens = settingsDto.maxTokens;
      }

      // Build messages array
      const messages: BaseMessage[] = [
        new SystemMessage(settingsDto.systemPrompt || this.defaultSystemPrompt),
        new HumanMessage(messageDto.content)
      ];

      // Get response from OpenAI
      const response = await this.openai.call(messages);
      const content = this.extractContent(response);

      // Create response DTO
      return plainToClass(ChatMessageDto, {
        id: Date.now().toString(),
        role: ChatRole.ASSISTANT,
        content: content,
        timestamp: new Date(),
        success: true
      });
    } catch (error) {
      const logger = LoggingManager.getInstance();
      logger.error('Chat service error:', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Return error response DTO
      return plainToClass(ChatMessageDto, {
        id: Date.now().toString(),
        role: ChatRole.ASSISTANT,
        content: 'Failed to process chat message',
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const chatService = new ChatService();
