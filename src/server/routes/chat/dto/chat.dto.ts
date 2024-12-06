import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsBoolean, IsNumber, IsObject, IsEnum, Min, Max } from 'class-validator';
import { ApiResult } from '../../../../types/error';
import { LogMetadata } from '../../../../types/logger';

/**
 * Base chat response with metadata
 */
export interface ChatResponseBase<T> extends ApiResult<T> {
  metadata?: LogMetadata & {
    userId?: string;
    sessionId?: string;
    modelName?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latency?: number;
  };
}

/**
 * Chat model enum
 */
export enum ChatModel {
  GPT4 = 'gpt-4',
  GPT35_TURBO = 'gpt-3.5-turbo',
  CLAUDE = 'claude',
  LLAMA = 'llama'
}

/**
 * Chat model configuration
 */
export interface ChatModelConfig {
  model: ChatModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
}

/**
 * Chat request metadata
 */
export interface ChatRequestMetadata {
  userId: string;
  sessionId?: string;
  modelConfig?: ChatModelConfig;
  systemPrompt?: string;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    currentUsage: number;
  };
}

/**
 * Chat message role enum
 */
export enum ChatRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function'
}

/**
 * Send message DTO
 */
export class SendMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'System prompt' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Model configuration' })
  @IsOptional()
  @IsObject()
  modelConfig?: ChatModelConfig;

  @ApiPropertyOptional({ description: 'Stream response' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

/**
 * Chat settings DTO
 */
export class ChatSettingsDto {
  @ApiProperty({ description: 'Default model', enum: ChatModel })
  @IsEnum(ChatModel)
  defaultModel: ChatModel;

  @ApiProperty({ description: 'Default temperature' })
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature: number;

  @ApiPropertyOptional({ description: 'Default max tokens' })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Default system prompt' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Stream responses by default' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

/**
 * Chat message DTO
 */
export class ChatMessageDto {
  @ApiProperty({ description: 'Message ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Message role', enum: ChatRole })
  @IsEnum(ChatRole)
  role: ChatRole;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Message metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Chat request DTO
 */
export class ChatRequestDto {
  @ApiProperty({ description: 'User message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Chat session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'System message' })
  @IsOptional()
  @IsString()
  systemMessage?: string;

  @ApiPropertyOptional({ description: 'Available functions' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatFunctionDto)
  functions?: ChatFunctionDto[];

  @ApiPropertyOptional({ description: 'Model configuration' })
  @IsOptional()
  @IsObject()
  config?: ChatModelConfig;

  @ApiPropertyOptional({ description: 'Request metadata' })
  @IsOptional()
  @IsObject()
  metadata?: ChatRequestMetadata;

  @ApiPropertyOptional({ description: 'Stream response' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

/**
 * Chat response data DTO
 */
export class ChatResponseDataDto {
  @ApiProperty({ description: 'Response content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Response metadata' })
  @IsOptional()
  @IsObject()
  metadata?: {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latency?: number;
  };
}

/**
 * Chat session DTO
 */
export class ChatSessionDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Session title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Created timestamp' })
  @IsString()
  @IsNotEmpty()
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  @IsString()
  @IsNotEmpty()
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Session metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Chat response type
 */
export interface ChatResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Chat function parameter schema DTO
 */
export class ChatFunctionParameterDto {
  @ApiProperty({ description: 'Parameter name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Parameter type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Parameter description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Whether parameter is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Parameter default value' })
  @IsOptional()
  default?: unknown;

  @ApiPropertyOptional({ description: 'Parameter enum values if type is enum' })
  @IsOptional()
  @IsArray()
  enum?: unknown[];
}

/**
 * Chat function definition DTO
 */
export class ChatFunctionDto {
  @ApiProperty({ description: 'Function name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Function description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Function parameters' })
  @ValidateNested({ each: true })
  @Type(() => ChatFunctionParameterDto)
  parameters: ChatFunctionParameterDto[];

  @ApiPropertyOptional({ description: 'Whether function is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Function metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Chat code snippet DTO
 */
export class ChatCodeSnippetDto {
  @ApiProperty({ description: 'Code content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Programming language' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiPropertyOptional({ description: 'File path if from a file' })
  @IsOptional()
  @IsString()
  filepath?: string;

  @ApiPropertyOptional({ description: 'Line numbers if from a file' })
  @IsOptional()
  @IsArray()
  lines?: [number, number];

  @ApiPropertyOptional({ description: 'Code snippet title or description' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Code snippet metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Chat stream chunk DTO
 */
export class ChatStreamChunkDto {
  @ApiProperty({ description: 'Chunk ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Chunk content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Is final chunk' })
  @IsBoolean()
  done: boolean;

  @ApiPropertyOptional({ description: 'Chunk metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Chat preferences DTO
 */
export class ChatPreferencesDto {
  @ApiProperty({ description: 'Default model', enum: ChatModel })
  @IsEnum(ChatModel)
  defaultModel: ChatModel;

  @ApiProperty({ description: 'Default temperature' })
  @IsNumber()
  @Min(0)
  @Max(2)
  defaultTemperature: number;

  @ApiPropertyOptional({ description: 'Default max tokens' })
  @IsOptional()
  @IsNumber()
  defaultMaxTokens?: number;

  @ApiPropertyOptional({ description: 'Default system prompt' })
  @IsOptional()
  @IsString()
  defaultSystemPrompt?: string;

  @ApiPropertyOptional({ description: 'Code snippet preferences' })
  @IsOptional()
  @IsObject()
  codeSnippets?: {
    showLineNumbers: boolean;
    theme: string;
    fontSize: number;
  };
}

/**
 * Chat state DTO
 */
export class ChatStateDto {
  @ApiProperty({ description: 'Chat messages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiProperty({ description: 'Loading status' })
  @IsBoolean()
  loading: boolean;

  @ApiPropertyOptional({ description: 'Error message' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'State metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Rate limit info' })
  @IsOptional()
  @IsObject()
  rateLimit?: {
    remaining: number;
    reset: number;
    limit: number;
  };
}
