import { spawn, ChildProcess } from 'child_process';

import { config } from '../config';
import { logger } from '../utils/logger';

interface PythonMessage {
  type: 'stdout' | 'stderr';
  data: string;
}

interface Memory {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class MemoryService {
  private pythonProcess: ChildProcess | null = null;
  private isInitialized = false;

  constructor() {
    this.initializePython().catch(error => {
      logger.error('Failed to initialize MemoryService:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  private async initializePython(): Promise<void> {
    try {
      this.pythonProcess = spawn('python', ['-c', `
        from mem0 import Memory
        import json
        import sys

        config = json.loads(sys.argv[1])
        memory = Memory.from_config(config)
      `, JSON.stringify(config)]);

      if (this.pythonProcess.stderr) {
        this.pythonProcess.stderr.on('data', (data: Buffer) => {
          logger.error('Python process error:', {
            error: data.toString(),
          });
        });
      }

      this.pythonProcess.on('close', (code: number) => {
        if (code !== 0) {
          logger.error('Python process exited with code:', { code });
          this.isInitialized = false;
        }
      });

      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize Python process:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async executePython<T>(code: string): Promise<T> {
    if (!this.isInitialized || !this.pythonProcess) {
      throw new Error('MemoryService not initialized');
    }

    return new Promise((resolve, reject) => {
      let result = '';
      let error = '';

      const process = spawn('python', ['-c', code]);

      process.stdout.on('data', (data: Buffer) => {
        result += data.toString();
      });

      process.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      process.on('close', (code: number) => {
        if (code !== 0) {
          reject(new Error(`Python execution failed: ${error}`));
        } else {
          try {
            resolve(JSON.parse(result) as T);
          } catch {
            resolve(result.trim() as T);
          }
        }
      });
    });
  }

  async addMemory(userId: string, message: string, response: string): Promise<void> {
    try {
      const sanitizedMessage = message.replace(/"/g, '\\"');
      const sanitizedResponse = response.replace(/"/g, '\\"');

      await this.executePython<{ success: boolean }>(`
        memory.add([
          {"role": "user", "content": "${sanitizedMessage}"},
          {"role": "assistant", "content": "${sanitizedResponse}"}
        ], user_id="${userId}")
      `);
    } catch (error) {
      logger.error('Failed to add memory:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async searchMemories(userId: string, query: string): Promise<Memory[]> {
    try {
      const sanitizedQuery = query.replace(/"/g, '\\"');
      const memories = await this.executePython<Memory[]>(`
        memories = memory.search("${sanitizedQuery}", user_id="${userId}")
        print(json.dumps(memories))
      `);
      return memories;
    } catch (error) {
      logger.error('Failed to search memories:', {
        userId,
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAllMemories(userId: string): Promise<Memory[]> {
    try {
      const memories = await this.executePython<Memory[]>(`
        memories = memory.get_all(user_id="${userId}")
        print(json.dumps(memories))
      `);
      return memories;
    } catch (error) {
      logger.error('Failed to get all memories:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
      this.isInitialized = false;
    }
  }
}
