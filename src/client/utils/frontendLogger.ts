import type { Logger } from '../../types/logger';

/* eslint-disable no-console */
const frontendLogger: Logger = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    console.info(message, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    console.warn(message, meta);
  },
  error: (message: string, meta?: Record<string, unknown>): void => {
    console.error(message, meta);
  },
  debug: (message: string, meta?: Record<string, unknown>): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(message, meta);
    }
  },
};
/* eslint-enable no-console */

export default frontendLogger;