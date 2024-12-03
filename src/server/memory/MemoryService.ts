import os from 'os';
import { EventEmitter } from 'events';
import { spawn, type ChildProcess } from 'child_process';
import config from '../config';
import { LoggingManager } from '../utils/logging/LoggingManager';

interface Memory {
  id: string;
  content: string;
  type: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface MemoryStats {
  total: number;
  used: number;
  free: number;
  cached: number;
  available: number;
  swapTotal: number;
  swapUsed: number;
  swapFree: number;
}

export class MemoryService extends EventEmitter {
  private pythonProcess: ChildProcess | null = null;
  private isInitialized = false;
  private stats: MemoryStats | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startMonitoring();
    this.initializePython().catch(error => {
      LoggingManager.getInstance().error('Failed to initialize MemoryService:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  private startMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(
      () => this.updateStats(),
      config.server.process.monitorInterval
    );

    // Initial update
    this.updateStats();
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
          LoggingManager.getInstance().error('Python process error:', {
            error: data.toString(),
          });
        });
      }

      await new Promise<void>((resolve, reject) => {
        if (!this.pythonProcess) {
          reject(new Error('Python process not initialized'));
          return;
        }

        this.pythonProcess.on('error', reject);
        this.pythonProcess.on('close', (code: number) => {
          if (code !== 0) {
            LoggingManager.getInstance().error('Python process exited with code:', { code });
            this.isInitialized = false;
            reject(new Error(`Python process exited with code ${code}`));
          } else {
            this.isInitialized = true;
            resolve();
          }
        });
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to initialize Python process:', {
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

  private async updateStats(): Promise<void> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // Get swap memory info (platform specific)
      let swapTotal = 0;
      let swapUsed = 0;
      let swapFree = 0;

      if (os.platform() === 'linux') {
        // Read from /proc/meminfo for Linux
        const meminfo = await this.readMemInfo();
        swapTotal = meminfo.SwapTotal || 0;
        swapFree = meminfo.SwapFree || 0;
        swapUsed = swapTotal - swapFree;
      }

      this.stats = {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        cached: 0, // Not available on all platforms
        available: freeMem,
        swapTotal,
        swapUsed,
        swapFree,
      };

      this.emit('stats', this.stats);
    } catch (error) {
      LoggingManager.getInstance().error('Failed to update memory stats:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async readMemInfo(): Promise<Record<string, number>> {
    // Implementation for reading /proc/meminfo on Linux
    // This is a placeholder - actual implementation would read the file
    return {
      SwapTotal: 0,
      SwapFree: 0,
    };
  }

  public getStats(): MemoryStats | null {
    return this.stats;
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
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
      LoggingManager.getInstance().error('Failed to add memory:', {
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
      LoggingManager.getInstance().error('Failed to search memories:', {
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
      LoggingManager.getInstance().error('Failed to get all memories:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.pythonProcess) {
      await new Promise<void>((resolve) => {
        if (!this.pythonProcess) {
          resolve();
          return;
        }

        this.pythonProcess.on('close', () => {
          resolve();
        });

        this.pythonProcess.kill();
      });

      this.pythonProcess = null;
      this.isInitialized = false;
    }
  }
}

export const memoryService = new MemoryService();

