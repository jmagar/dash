import { RedisClientType } from 'redis';
import { cache } from '../cache';
import { LoggingManager } from '../utils/logging/LoggingManager';
import { ChatRole } from '../routes/chat/dto/chat.dto';

interface ConversationMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

export class ConversationCache {
  private readonly client: RedisClientType;
  private readonly prefix = 'conversation:';
  private readonly expiration = 60 * 60 * 24 * 7; // 7 days

  constructor() {
    this.client = cache.getClient();
  }

  private getKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  async saveHistory(sessionId: string, messages: ConversationMessage[]): Promise<void> {
    try {
      const key = this.getKey(sessionId);
      await this.client.set(key, JSON.stringify(messages), {
        EX: this.expiration
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to save conversation history:', {
        error: error instanceof Error ? error.message : String(error),
        sessionId
      });
    }
  }

  async getHistory(sessionId: string): Promise<ConversationMessage[]> {
    try {
      const key = this.getKey(sessionId);
      const data = await this.client.get(key);
      if (!data) return [];
      
      return JSON.parse(data).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      LoggingManager.getInstance().error('Failed to retrieve conversation history:', {
        error: error instanceof Error ? error.message : String(error),
        sessionId
      });
      return [];
    }
  }

  async clearHistory(sessionId: string): Promise<void> {
    try {
      const key = this.getKey(sessionId);
      await this.client.del(key);
    } catch (error) {
      LoggingManager.getInstance().error('Failed to clear conversation history:', {
        error: error instanceof Error ? error.message : String(error),
        sessionId
      });
    }
  }
}

export const conversationCache = new ConversationCache();

