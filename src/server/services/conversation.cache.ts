import type { CacheClient } from '../cache';
import cacheModule from '../cache';
import { LoggingManager } from '../managers/LoggingManager';
import { ChatRole } from '../routes/chat/dto/chat.dto';
import type { JsonObject } from '../managers/types/manager.types';

interface ConversationMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

interface SerializedMessage extends JsonObject {
  role: ChatRole;
  content: string;
  timestamp: string;
}

export class ConversationCache {
  private readonly client: CacheClient;
  private readonly prefix = 'conversation:';
  private readonly expiration = 60 * 60 * 24 * 7; // 7 days
  private readonly logger: LoggingManager;

  constructor() {
    this.client = cacheModule.getClient();
    this.logger = LoggingManager.getInstance();
  }

  private getKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  private serializeMessages(messages: ConversationMessage[]): SerializedMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
  }

  private deserializeMessages(data: string): ConversationMessage[] {
    const messages = JSON.parse(data) as SerializedMessage[];
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp)
    }));
  }

  async saveHistory(sessionId: string, messages: ConversationMessage[]): Promise<void> {
    try {
      const key = this.getKey(sessionId);
      const serializedMessages = this.serializeMessages(messages);
      await this.client.set(key, JSON.stringify(serializedMessages), this.expiration);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save conversation history:', {
        error: errorMessage,
        sessionId
      });
      throw new Error(`Failed to save conversation history: ${errorMessage}`);
    }
  }

  async getHistory(sessionId: string): Promise<ConversationMessage[]> {
    try {
      const key = this.getKey(sessionId);
      const data = await this.client.get<string>(key);
      if (!data) return [];
      
      return this.deserializeMessages(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to retrieve conversation history:', {
        error: errorMessage,
        sessionId
      });
      return [];
    }
  }

  async clearHistory(sessionId: string): Promise<void> {
    try {
      const key = this.getKey(sessionId);
      await this.client.delete(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to clear conversation history:', {
        error: errorMessage,
        sessionId
      });
      throw new Error(`Failed to clear conversation history: ${errorMessage}`);
    }
  }
}

export const conversationCache = new ConversationCache();
