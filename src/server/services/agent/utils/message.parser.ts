import { RawData } from 'ws';
import { logger } from '../../../utils/logger';
import { Message, MessageData } from '../types/message.types';
import { LoggingManager } from '../../../managers/utils/LoggingManager';

export class MessageParser {
  static parse(data: RawData): MessageData | null {
    try {
      let rawMessage: string;
      
      // Handle different input types
      try {
        if (Buffer.isBuffer(data)) {
          rawMessage = data.toString('utf8');
        } else if (typeof data === 'string') {
          rawMessage = data;
        } else if (data instanceof ArrayBuffer) {
          rawMessage = Buffer.from(data).toString('utf8');
        } else if (Array.isArray(data)) {
          rawMessage = Buffer.concat(data.map(chunk => 
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          )).toString('utf8');
        } else {
          throw new Error('Unsupported message data type');
        }
      } catch (error) {
        loggerLoggingManager.getInstance().(),
          dataType: typeof data
        });
        return null;
      }
      
      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawMessage);
      } catch (error) {
        loggerLoggingManager.getInstance().(),
          rawMessage
        });
        return null;
      }
      
      // Validate message structure
      const result = Message.safeParse(parsed);
      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }));
        loggerLoggingManager.getInstance().();
        return null;
      }

      // Additional validation for required fields based on message type
      const message = result.data;
      try {
        switch (message.type) {
          case 'register':
            if (!message.payload?.info) {
              throw new Error('Missing required info for register message');
            }
            break;
          case 'heartbeat':
          case 'metrics':
            if (!message.payload?.metrics) {
              throw new Error('Missing required metrics for heartbeat/metrics message');
            }
            break;
          case 'command_response':
            if (!message.payload?.result) {
              throw new Error('Missing required result for command response message');
            }
            break;
          case 'error':
            if (!message.payload?.error) {
              throw new Error('Missing required error details for error message');
            }
            break;
        }
      } catch (error) {
        loggerLoggingManager.getInstance().(),
          messageType: message.type,
          messageId: message.id
        });
        return null;
      }

      return message;
    } catch (error) {
      loggerLoggingManager.getInstance().(),
        dataType: typeof data,
        isBuffer: Buffer.isBuffer(data),
        isArrayBuffer: data instanceof ArrayBuffer,
        isArray: Array.isArray(data)
      });
      return null;
    }
  }

  static isMessageData(data: unknown): data is MessageData {
    return Message.safeParse(data).success;
  }

  static validateMessageType<T extends MessageData['type']>(
    message: MessageData,
    expectedType: T
  ): message is MessageData & { type: T } {
    return message.type === expectedType;
  }
}


