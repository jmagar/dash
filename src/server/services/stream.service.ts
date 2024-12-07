import type { Response } from 'express';
import { ChatRole } from '../routes/chat/dto/chat.dto';
import { LoggingManager } from '../managers/LoggingManager';
import { MessageSanitizer } from '../utils/sanitizer/messageSanitizer';

export class StreamService {
  private static readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  static setupSSE(res: Response): Response {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial connection success
    res.write('event: connected\ndata: true\n\n');

    // Setup heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(':\n\n'); // Comment line as heartbeat
    }, StreamService.HEARTBEAT_INTERVAL);

    // Clean up on close
    res.on('close', () => {
      clearInterval(heartbeat);
      res.end();
    });

    return res;
  }

  static sendChunk(res: Response, chunk: string, role: ChatRole = ChatRole.ASSISTANT) {
    try {
      const sanitizedChunk = MessageSanitizer.formatResponse(chunk);
      const data = JSON.stringify({
        role,
        content: sanitizedChunk,
        timestamp: new Date()
      });

      res.write(`data: ${data}\n\n`);
    } catch (error) {
      LoggingManager.getInstance().error('Error sending SSE chunk:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static sendError(res: Response, error: Error | string) {
    try {
      const data = JSON.stringify({
        role: ChatRole.SYSTEM,
        content: error instanceof Error ? error.message : error,
        timestamp: new Date(),
        error: true
      });

      res.write(`data: ${data}\n\n`);
    } catch (err) {
      LoggingManager.getInstance().error('Error sending SSE error:', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  static endStream(res: Response) {
    res.write('event: done\ndata: true\n\n');
    res.end();
  }
}
