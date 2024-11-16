import Transport from 'winston-transport';
import axios from 'axios';
import type { LogEntry } from '../../types/logger';
import { config } from '../config';

interface GotifyOptions {
  url: string;
  token: string;
  level?: string;
}

/**
 * Winston transport for critical Gotify notifications
 */
export class GotifyTransport extends Transport {
  private url: string;
  private token: string;

  constructor(opts: GotifyOptions) {
    super(opts);
    this.url = opts.url;
    this.token = opts.token;
  }

  private formatMessage(info: LogEntry): string {
    const metadata = info.metadata ? JSON.stringify(info.metadata, null, 2) : '';
    return `${info.message}\n\n${metadata}`;
  }

  async log(info: LogEntry & { notify?: boolean }, callback: () => void): Promise<void> {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Only send notification if notify flag is true
    if (!info.notify) {
      callback();
      return;
    }

    try {
      await axios.post(
        `${this.url}/message`,
        {
          title: `[CRITICAL] ${info.message.split('\n')[0]}`,
          message: this.formatMessage(info),
          priority: 8 // Highest priority
        },
        {
          headers: {
            'X-Gotify-Key': this.token
          }
        }
      );
    } catch (error) {
      console.error('Failed to send Gotify notification:', error);
    }

    callback();
  }
}
