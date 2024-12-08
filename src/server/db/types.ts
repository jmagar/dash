import type { Result, PaginatedResponse, QueryOptions, CacheOptions } from '../../types/common';
import type { ChatMessageDto, ChatSessionDto } from '../routes/chat/dto/chat.dto';
import type { UserPreferences } from '@prisma/client';

export interface DatabaseStats {
  messageCount: number;
  sessionCount: number;
  averageMessagesPerSession: number;
  averageSessionDuration: number; // in seconds
  lastMessageTimestamp?: string;
}

export interface ChatSessionQuery {
  userId: string;
  status?: 'active' | 'archived' | 'deleted';
  startDate?: Date;
  endDate?: Date;
  minMessages?: number;
  maxMessages?: number;
}

export interface ChatMessageQuery {
  sessionId: string;
  role?: string;
  startDate?: Date;
  endDate?: Date;
  contentSearch?: string;
}

export interface DatabaseInterface {
  chatSessions: {
    /**
     * Create a new chat session
     */
    create(session: ChatSessionDto): Promise<Result<ChatSessionDto>>;

    /**
     * Find chat session by ID with optional caching
     */
    findById(id: string, cacheOptions?: CacheOptions): Promise<Result<ChatSessionDto>>;

    /**
     * Search chat sessions with filtering and pagination
     */
    search(query: ChatSessionQuery, options: QueryOptions & CacheOptions): Promise<PaginatedResponse<ChatSessionDto>>;

    /**
     * Update chat session
     */
    update(id: string, updates: Partial<ChatSessionDto>): Promise<Result<ChatSessionDto>>;

    /**
     * Delete chat session
     */
    delete(id: string): Promise<Result<void>>;

    /**
     * Get stats for user's chat sessions
     */
    getStats(userId: string): Promise<Result<DatabaseStats>>;

    /**
     * Archive old or inactive sessions
     */
    archiveSessions(userId: string, beforeDate: Date): Promise<Result<number>>;

    /**
     * Clean up deleted sessions and their messages
     */
    cleanupSessions(olderThanDays: number): Promise<Result<number>>;
  };

  chatMessages: {
    /**
     * Create a new chat message
     */
    create(message: ChatMessageDto): Promise<Result<ChatMessageDto>>;

    /**
     * Create multiple chat messages in batch
     */
    bulkCreate(messages: ChatMessageDto[]): Promise<Result<ChatMessageDto[]>>;

    /**
     * Find messages by session ID with filtering and pagination
     */
    findBySessionId(
      sessionId: string,
      options: QueryOptions & CacheOptions
    ): Promise<PaginatedResponse<ChatMessageDto>>;

    /**
     * Search messages with advanced filtering
     */
    search(
      query: ChatMessageQuery,
      options: QueryOptions & CacheOptions
    ): Promise<PaginatedResponse<ChatMessageDto>>;

    /**
     * Update chat message
     */
    update(id: string, updates: Partial<ChatMessageDto>): Promise<Result<ChatMessageDto>>;

    /**
     * Delete chat message
     */
    delete(id: string): Promise<Result<void>>;

    /**
     * Delete all messages for a session
     */
    bulkDelete(sessionId: string): Promise<Result<number>>;

    /**
     * Get stats for session messages
     */
    getStats(sessionId: string): Promise<Result<DatabaseStats>>;

    /**
     * Clean up old messages based on retention policy
     */
    cleanupMessages(retentionDays: number): Promise<Result<number>>;
  };

  userPreferences: {
    /**
     * Create or update user preferences
     */
    upsert(userId: string, preferences: Partial<UserPreferences>): Promise<Result<UserPreferences>>;

    /**
     * Find user preferences by user ID
     */
    findByUserId(userId: string): Promise<Result<UserPreferences | null>>;

    /**
     * Delete user preferences by user ID
     */
    deleteByUserId(userId: string): Promise<Result<void>>;

    /**
     * Update user preferences
     */
    update(userId: string, updates: Partial<UserPreferences>): Promise<Result<UserPreferences>>;
  };

  // Cache management
  cache: {
    /**
     * Get cached value
     */
    get<T>(key: string, namespace?: string): Promise<T | null>;

    /**
     * Set cached value with TTL
     */
    set<T>(key: string, value: T, ttlSeconds: number, namespace?: string): Promise<boolean>;

    /**
     * Delete cached value
     */
    delete(key: string, namespace?: string): Promise<boolean>;

    /**
     * Clear all cached values in namespace
     */
    clear(namespace?: string): Promise<boolean>;
  };
}
