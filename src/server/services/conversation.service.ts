import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage, BaseMessage, AIMessage } from 'langchain/schema';
import { ContextProvider } from './context.provider';
import config from '../config';
import { LoggingManager } from '../managers/utils/LoggingManager';
import { SendMessageDto, ChatMessageDto, ChatSettingsDto, ChatRole } from '../routes/chat/dto/chat.dto';
import { plainToClass } from 'class-transformer';
import { ChatbotContext } from '../../types/chatbot';
import { conversationCache } from './conversation.cache';
import { Response } from 'express';
import { StreamService } from './stream.service';
import { MessageSanitizer } from '../utils/messageSanitizer';

interface ConversationMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

class ConversationService {
  private openai: ChatOpenAI;
  private contextProvider: ContextProvider;
  private readonly maxHistoryLength = 10; // Configurable max history length
  private readonly maxTokens = 4096; // Default token limit
  private readonly defaultSystemPrompt = `You are a helpful assistant with access to system information about servers, containers, and application state. You can answer questions about the system state and help users understand their infrastructure.`;

  constructor() {
    this.openai = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.model,
      temperature: config.openai.temperature,
    });
    this.contextProvider = ContextProvider.getInstance();
  }

  private async getHistory(sessionId: string): Promise<ConversationMessage[]> {
    return await conversationCache.getHistory(sessionId);
  }

  private async saveHistory(sessionId: string, messages: ConversationMessage[]): Promise<void> {
    // Trim history if needed
    if (messages.length > this.maxHistoryLength) {
      messages = messages.slice(messages.length - this.maxHistoryLength);
    }
    await conversationCache.saveHistory(sessionId, messages);
  }

  private async buildSystemContext(): Promise<string> {
    const context = await this.contextProvider.getCurrentContext();
    return `Current System State:
- Cache Status: ${JSON.stringify(context.systemState.cacheStatus)}
- Database Status: ${JSON.stringify(context.systemState.dbStatus)}
- Active Hosts: ${context.systemState.activeHosts.length}
- System Metrics: ${JSON.stringify(context.systemState.metrics)}
`;
  }

  private async buildMessages(sessionId: string, userMessage: string, systemPrompt?: string): Promise<BaseMessage[]> {
    const messages: BaseMessage[] = [];
    
    // Add system prompt with current context
    const contextInfo = await this.buildSystemContext();
    messages.push(new SystemMessage(`${systemPrompt || this.defaultSystemPrompt}\n\n${contextInfo}`));
    
    // Add conversation history
    const history = await this.getHistory(sessionId);
    for (const msg of history) {
      if (msg.role === ChatRole.USER) {
        messages.push(new HumanMessage(msg.content));
      } else {
        messages.push(new AIMessage(msg.content));
      }
    }
    
    // Add current message
    messages.push(new HumanMessage(userMessage));
    
    return messages;
  }

  private async updateHistory(sessionId: string, message: ConversationMessage) {
    const history = await this.getHistory(sessionId);
    history.push(message);
    await this.saveHistory(sessionId, history);
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
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    return '';
  }

  async chat(messageDto: SendMessageDto, settingsDto: ChatSettingsDto, sessionId: string): Promise<ChatMessageDto> {
    try {
      // Update conversation history with user message
      await this.updateHistory(sessionId, {
        role: ChatRole.USER,
        content: messageDto.content,
        timestamp: new Date()
      });

      // Configure OpenAI with settings
      this.openai.temperature = settingsDto.temperature || config.openai.temperature;
      this.openai.maxTokens = settingsDto.maxTokens || this.maxTokens;

      // Build messages array with history and context
      const messages = await this.buildMessages(
        sessionId,
        messageDto.content,
        settingsDto.systemPrompt
      );

      // Get response from OpenAI
      const response = await this.openai.call(messages);
      const content = this.extractContent(response);

      // Update conversation history with assistant response
      await this.updateHistory(sessionId, {
        role: ChatRole.ASSISTANT,
        content: content,
        timestamp: new Date()
      });

      // Create response DTO
      return plainToClass(ChatMessageDto, {
        id: Date.now().toString(),
        role: ChatRole.ASSISTANT,
        content: content,
        timestamp: new Date(),
        success: true
      });
    } catch (error) {
      LoggingManager.getInstance().error('Conversation service error:', {
        error: error instanceof Error ? error.message : String(error),
        sessionId
      });
      
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

  async streamChat(
    messageDto: SendMessageDto,
    settingsDto: ChatSettingsDto,
    sessionId: string,
    res: Response
  ): Promise<void> {
    try {
      // Set up SSE
      StreamService.setupSSE(res);

      // Update conversation history with user message
      await this.updateHistory(sessionId, {
        role: ChatRole.USER,
        content: MessageSanitizer.formatResponse(messageDto.content),
        timestamp: new Date()
      });

      // Configure OpenAI with streaming
      const openai = new ChatOpenAI({
        openAIApiKey: config.openai.apiKey,
        modelName: config.openai.model,
        temperature: settingsDto.temperature || config.openai.temperature,
        maxTokens: settingsDto.maxTokens || this.maxTokens,
        streaming: true,
      });

      // Build messages array with history and context
      const messages = await this.buildMessages(
        sessionId,
        messageDto.content,
        settingsDto.systemPrompt
      );

      let fullResponse = '';

      // Stream the response
      await openai.call(messages, {
        callbacks: [
          {
            handleLLMNewToken(token: string) {
              fullResponse += token;
              StreamService.sendChunk(res, token);
            },
            handleLLMError(error: Error) {
              StreamService.sendError(res, error);
              StreamService.endStream(res);
            },
          },
        ],
      });

      // Update conversation history with complete response
      await this.updateHistory(sessionId, {
        role: ChatRole.ASSISTANT,
        content: MessageSanitizer.formatResponse(fullResponse),
        timestamp: new Date()
      });

      StreamService.endStream(res);
    } catch (error) {
      LoggingManager.getInstance().error('Streaming chat error:', {
        error: error instanceof Error ? error.message : String(error),
        sessionId
      });
      
      StreamService.sendError(res, error instanceof Error ? error : 'Internal server error');
      StreamService.endStream(res);
    }
  }

  async clearHistory(sessionId: string): Promise<void> {
    await conversationCache.clearHistory(sessionId);
  }

  async getConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
    return await conversationCache.getHistory(sessionId);
  }
}

export const conversationService = new ConversationService();


