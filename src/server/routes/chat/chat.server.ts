import { ApiError } from '../../../types/error';
import { ChatMessageDto, ChatRequestDto, ChatResponseDataDto, ChatResponse, ChatRole, ChatSessionDto } from './dto/chat.dto';
import { DatabaseInterface } from '../../../server/db/types';
import { QueryOptions, DEFAULT_PAGE_SIZE, CacheOptions, PaginatedResponse } from '../../../types/common';
import { Config } from '../../../types/config';
import { ChatModel, ChatCompletionParams, ChatModelConfig } from '../../../types/chat-model';
import { LoggingManager } from '../../managers/LoggingManager';

const HTTP_STATUS = {
  INTERNAL_SERVER_ERROR: 500,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401
} as const;

type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

interface QueryOptionsWithCache extends QueryOptions, CacheOptions {}

export class ChatModelService implements ChatModel {
  constructor(private config: Config) {}

  get defaultModel() {
    return this.config.chatModel.model;
  }

  async createChatCompletion(_params: ChatCompletionParams) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock response
    return {
      success: true,
      data: {
        content: 'Mock response',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      }
    };
  }

  getModelConfig(): ChatModelConfig {
    const config = this.config.chatModel.defaultConfig;
    return {
      model: config.model,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      topP: config.topP ?? 1,
      frequencyPenalty: config.frequencyPenalty ?? 0,
      presencePenalty: config.presencePenalty ?? 0,
      stream: config.stream ?? false
    };
  }

  setModelConfig(config: Partial<ChatModelConfig>): void {
    // Only update valid properties
    const validConfig: Partial<ChatModelConfig> = {
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      stream: config.stream
    };
    Object.assign(this.config.chatModel.defaultConfig, validConfig);
  }
}

export class ChatServer {
  private readonly logger: LoggingManager;
  private readonly chatModel: ChatModel;

  constructor(
    private readonly db: DatabaseInterface,
    private readonly config: Config,
    private readonly cacheOptions: CacheOptions
  ) {
    this.logger = LoggingManager.getInstance();
    this.chatModel = new ChatModelService(config);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private validateChatRequest(request: ChatRequestDto): void {
    if (!request.message?.trim()) {
      throw new ApiError('Message content is required', 'INVALID_MESSAGE', HTTP_STATUS.BAD_REQUEST);
    }
  }

  private validateSession(session: ChatSessionDto): void {
    if (!session.id || !session.userId) {
      throw new ApiError('Invalid session', 'INVALID_SESSION', HTTP_STATUS.BAD_REQUEST);
    }
  }

  async processChat(session: ChatSessionDto, request: ChatRequestDto): Promise<ChatResponse<ChatResponseDataDto>> {
    try {
      this.validateSession(session);
      this.validateChatRequest(request);

      this.logger.info('Processing chat request', {
        sessionId: session.id,
        userId: session.userId,
        messageLength: request.message.length
      });

      // Get chat history
      const queryOptions: QueryOptionsWithCache = {
        pageSize: 100,
        sort: [{ field: 'timestamp', direction: 'desc' }],
        ttl: this.cacheOptions.ttl
      };

      const messagesResponse = await this.db.chatMessages.findBySessionId(session.id, queryOptions);

      if (!messagesResponse?.items || !Array.isArray(messagesResponse.items)) {
        throw new ApiError('Failed to fetch chat messages', 'FETCH_FAILED', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      const chatHistory = messagesResponse.items;

      // Add new message
      const newMessage: ChatMessageDto = {
        id: this.generateMessageId(),
        role: ChatRole.USER,
        content: request.message,
        timestamp: new Date().toISOString(),
        metadata: {
          userId: session.userId,
          sessionId: session.id,
          ...request.metadata
        }
      };

      chatHistory.push(newMessage);

      const response = await this.generateChatResponse(chatHistory, session);
      if (response instanceof ApiError) {
        this.logger.error('Failed to generate chat response', {
          error: response.message,
          sessionId: session.id,
          userId: session.userId
        });

        return {
          success: false,
          error: response.message,
          status: response.status,
          metadata: {
            userId: session.userId,
            sessionId: session.id,
            latency: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          }
        };
      }

      const responseMetadata = response.metadata || {};
      const result: ChatResponse<ChatResponseDataDto> = {
        success: true,
        data: response,
        metadata: {
          userId: session.userId,
          sessionId: session.id,
          latency: typeof responseMetadata.latency === 'number' ? responseMetadata.latency : 0,
          history: chatHistory.length - 1,
          contextLength: JSON.stringify(chatHistory).length,
          promptTokens: typeof responseMetadata.promptTokens === 'number' ? responseMetadata.promptTokens : 0,
          completionTokens: typeof responseMetadata.completionTokens === 'number' ? responseMetadata.completionTokens : 0,
          totalTokens: typeof responseMetadata.totalTokens === 'number' ? responseMetadata.totalTokens : 0
        }
      };

      this.logger.info('Chat response generated successfully', {
        sessionId: session.id,
        userId: session.userId,
        tokens: result.metadata?.totalTokens
      });

      return result;
    } catch (error) {
      this.logger.error('Error processing chat request', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: session.id,
        userId: session.userId
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        'Failed to process chat request',
        'CHAT_PROCESSING_FAILED',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async generateChatResponse(messages: ChatMessageDto[], session: ChatSessionDto): Promise<ChatResponseDataDto | ApiError> {
    const startTime = Date.now();
    
    try {
      const modelConfig = this.chatModel.getModelConfig();
      const systemMessage = new ChatMessageDto();
      systemMessage.role = ChatRole.SYSTEM;
      systemMessage.content = String(session.metadata?.context || 'New conversation');

      const modelMessages = [systemMessage, ...messages];

      const params: ChatCompletionParams = {
        model: modelConfig.model,
        messages: modelMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        top_p: modelConfig.topP,
        frequency_penalty: modelConfig.frequencyPenalty,
        presence_penalty: modelConfig.presencePenalty,
        stream: modelConfig.stream
      };

      const response = await this.chatModel.createChatCompletion(params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to generate response');
      }

      const responseData = response.data;
      const latency = Date.now() - startTime;

      return {
        content: responseData.content,
        metadata: {
          promptTokens: responseData.usage?.promptTokens ?? 0,
          completionTokens: responseData.usage?.completionTokens ?? 0,
          totalTokens: responseData.usage?.totalTokens ?? 0,
          latency
        }
      };
    } catch (error) {
      return new ApiError(
        error instanceof Error ? error.message : 'Failed to generate chat response',
        error,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  async listSessions(userId: string, options: QueryOptions = {}): Promise<PaginatedResponse<ChatSessionDto>> {
    const queryOptions: QueryOptionsWithCache = {
      ...options,
      ttl: this.cacheOptions.ttl
    };

    const result = await this.db.chatSessions.search({ userId }, queryOptions);
    
    return {
      items: result.items || [],
      pageInfo: {
        total: result.items?.length || 0,
        page: options.page || 1,
        pageSize: options.pageSize || DEFAULT_PAGE_SIZE,
        hasNext: false,
        hasPrevious: options.page ? options.page > 1 : false,
        totalPages: Math.ceil((result.items?.length || 0) / (options.pageSize || DEFAULT_PAGE_SIZE))
      }
    };
  }

  async getSession(sessionId: string, userId: string): Promise<ChatSessionDto | null> {
    const result = await this.db.chatSessions.findById(sessionId);
    
    if (!result.success || !result.data) {
      return null;
    }

    const session = result.data;
    if (session.userId !== userId) {
      return null;
    }

    return session;
  }
}
