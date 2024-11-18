import Transport from 'winston-transport';
import axios from 'axios';
import { LogEntry } from 'winston';
import config from '../config';

/**
 * Winston transport for Gotify notifications
 */
export class GotifyTransport extends Transport {
  protected readonly transportName: string;
  public level: string;

  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
    this.transportName = 'gotify';
    this.level = opts?.level || 'error';
  }

  log(info: LogEntry, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (!config.gotify?.url || !config.gotify?.token || info.level !== this.level) {
      callback();
      return;
    }

    void this.sendNotification(info).then(() => callback());
  }

  private async sendNotification(info: LogEntry): Promise<void> {
    try {
      const { level, message, ...meta } = info;
      const priority = this.getPriority(level);

      await axios.post(
        `${config.gotify.url}/message`,
        {
          title: `[${level.toUpperCase()}] Server Alert`,
          message: message,
          priority: priority,
          extras: meta,
        },
        {
          headers: {
            'X-Gotify-Key': config.gotify.token,
          },
        }
      );
    } catch (error) {
      console.error('Failed to send notification to Gotify:', error);
    }
  }

  private getPriority(level: string): number {
    switch (level) {
      case 'error':
        return 8;
      case 'warn':
        return 5;
      case 'info':
        return 3;
      default:
        return 1;
    }
  }
}
