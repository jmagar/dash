import Transport from 'winston-transport';
import { Readable, Writable } from 'stream';
import axios from 'axios';
import { LogEntry } from 'winston';
import { EventEmitter } from 'events';
import { LogLevel } from '../../types/logger';

interface GotifyMessage {
  message: string;
  title: string;
  priority: number;
  extras?: Record<string, unknown>;
}

interface GotifyTransportOptions extends Transport.TransportStreamOptions {
  level?: LogLevel;
  gotifyUrl?: string;
  gotifyToken?: string;
}

// Define valid log levels with const assertion
const LOG_LEVELS = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'] as const;
type LogLevel = typeof LOG_LEVELS[number];

// Define chunk types for write operations
type TransportChunk = string | Buffer | NodeJS.TypedArray;

// Define TransportStream event types with proper type safety
interface TransportStreamEvents {
  readonly close: () => void;
  readonly drain: () => void;
  readonly error: (err: Error) => void;
  readonly finish: () => void;
  readonly pipe: (src: Readable) => void;
  readonly unpipe: (src: Readable) => void;
  readonly logged: (info: LogEntry) => void;
}

/**
 * Winston transport for Gotify notifications
 */
export class GotifyTransport extends Transport {
  protected readonly transportName: string;
  public readonly level: LogLevel;
  public readonly writable: boolean;
  protected readonly writableStream: Writable;
  protected readonly gotifyUrl: string;
  protected readonly gotifyToken: string;
  protected readonly emitter: EventEmitter;

  // Required TransportStream properties
  public readonly writableEnded: boolean;
  public readonly writableFinished: boolean;
  public readonly writableHighWaterMark: number;
  public readonly writableLength: number;
  public readonly writableObjectMode: boolean;
  public writableCorked: number;
  public destroyed: boolean;
  public closed: boolean;
  public errored: Error | null;
  public writableNeedDrain: boolean;

  constructor(opts?: GotifyTransportOptions) {
    super(opts);

    if (!opts?.gotifyUrl || !opts?.gotifyToken) {
      throw new Error('GotifyTransport requires gotifyUrl and gotifyToken options');
    }

    this.transportName = 'gotify';
    this.level = this.validateLogLevel(opts?.level);
    this.writable = true;
    this.gotifyUrl = opts.gotifyUrl;
    this.gotifyToken = opts.gotifyToken;
    this.emitter = new EventEmitter();

    // Initialize required TransportStream properties
    this.writableEnded = false;
    this.writableFinished = false;
    this.writableHighWaterMark = 16384;
    this.writableLength = 0;
    this.writableObjectMode = true;
    this.writableCorked = 0;
    this.destroyed = false;
    this.closed = false;
    this.errored = null;
    this.writableNeedDrain = false;

    // Initialize writable stream with proper error handling
    this.writableStream = new Writable({
      write: (chunk: TransportChunk, _encoding: string, callback: (error?: Error | null) => void) => {
        this.handleWrite(chunk).then(() => callback()).catch((error: Error) => {
          this.emitter.emit('error', error);
          callback(error);
        });
      }
    });

    this.writableStream.on('error', (err: Error) => {
      this.emitter.emit('error', err);
    });
  }

  private validateLogLevel(level?: string): LogLevel {
    if (!level) return 'info';
    if (LOG_LEVELS.includes(level as LogLevel)) {
      return level as LogLevel;
    }
    throw new Error(`Invalid log level: ${level}. Must be one of: ${LOG_LEVELS.join(', ')}`);
  }

  private async handleWrite(chunk: TransportChunk): Promise<void> {
    try {
      const entry = this.parseLogEntry(chunk);
      await this.log(entry, () => {
        // Callback is required by Winston Transport API but no action needed here
        // since we're using async/await for flow control
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw error;
    }
  }

  private parseLogEntry(chunk: TransportChunk): LogEntry {
    try {
      return JSON.parse(chunk.toString()) as LogEntry;
    } catch (err) {
      throw new Error(`Failed to parse log entry: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Core logging method exposed to Winston.
   */
  async log(info: LogEntry, callback: () => void): Promise<void> {
    try {
      setImmediate(() => {
        this.emitter.emit('logged', info);
      });

      const { level, message, ...meta } = info;
      const logLevel = this.validateLogLevel(level);

      if (!this._shouldLog(logLevel)) {
        callback();
        return;
      }

      const gotifyMessage: GotifyMessage = {
        message: String(message),
        title: `${logLevel.toUpperCase()}: ${this.transportName}`,
        priority: this._getPriority(logLevel),
        extras: meta
      };

      await this.sendGotifyMessage(gotifyMessage);
      this.emitter.emit('logged', info);
      callback();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emitter.emit('error', err);
      callback();
      throw err;
    }
  }

  private async sendGotifyMessage(message: GotifyMessage): Promise<void> {
    try {
      await axios.post(`${this.gotifyUrl}/message`, message, {
        headers: {
          'X-Gotify-Key': this.gotifyToken
        }
      });
    } catch (error) {
      throw new Error(`Failed to send Gotify message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mapping of log levels to Gotify priority with type safety
   */
  private _getPriority(level: LogLevel): number {
    const priorities: Record<LogLevel, number> = {
      error: 8,
      warn: 5,
      info: 3,
      verbose: 1,
      debug: 1,
      silly: 1
    };
    return priorities[level];
  }

  /**
   * Check if the log level meets the minimum threshold with type safety
   */
  private _shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      verbose: 3,
      debug: 4,
      silly: 5
    };
    return levels[level] <= levels[this.level];
  }

  /**
   * Clean up function
   */
  _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    if (error) {
      this.emitter.emit('error', error);
    }
    this.writableStream.end(callback);
  }

  write(chunk: TransportChunk, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void): boolean;
  write(chunk: TransportChunk, callback?: (error: Error | null | undefined) => void): boolean;
  write(chunk: TransportChunk, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void): boolean {
    try {
      if (typeof encodingOrCallback === 'function') {
        return this.writableStream.write(chunk, encodingOrCallback);
      }
      return this.writableStream.write(chunk, encodingOrCallback || 'utf8', callback);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emitter.emit('error', error);
      if (typeof encodingOrCallback === 'function') {
        encodingOrCallback(error);
      } else if (callback) {
        callback(error);
      }
      return false;
    }
  }

  // Event emitter methods with proper typing
  emit<E extends keyof TransportStreamEvents>(
    event: E,
    ...args: Parameters<TransportStreamEvents[E]>
  ): boolean {
    return this.emitter.emit(event, ...args);
  }

  on<E extends keyof TransportStreamEvents>(
    event: E,
    listener: TransportStreamEvents[E]
  ): this {
    this.emitter.on(event, listener as Parameters<TransportStreamEvents[E]> extends []
      ? () => void
      : (arg: Parameters<TransportStreamEvents[E]>[0]) => void);
    return this;
  }

  once<E extends keyof TransportStreamEvents>(
    event: E,
    listener: TransportStreamEvents[E]
  ): this {
    this.emitter.once(event, listener as Parameters<TransportStreamEvents[E]> extends []
      ? () => void
      : (arg: Parameters<TransportStreamEvents[E]>[0]) => void);
    return this;
  }

  removeListener<E extends keyof TransportStreamEvents>(
    event: E,
    listener: TransportStreamEvents[E]
  ): this {
    this.emitter.removeListener(event, listener as Parameters<TransportStreamEvents[E]> extends []
      ? () => void
      : (arg: Parameters<TransportStreamEvents[E]>[0]) => void);
    return this;
  }

  // Required TransportStream methods
  cork(): void {
    this.writableCorked++;
  }

  uncork(): void {
    if (this.writableCorked) {
      this.writableCorked--;
    }
  }

  setDefaultEncoding(encoding: BufferEncoding): this {
    return this;
  }
}
