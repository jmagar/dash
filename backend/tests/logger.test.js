'use strict';

const fs = require('fs');
const path = require('path');

const { logger } = require(path.join(__dirname, '..', '..', 'src', 'utils', 'logger'));

describe('Logger', () => {
  const logDir = path.join(__dirname, '..', '..', 'logs');
  const testMessage = 'Test log message';
  const testContext = { test: true, value: 123 };

  beforeAll(() => {
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test log files
    const files = fs.readdirSync(logDir);
    files.forEach((file) => {
      if (file.startsWith('test-')) {
        fs.unlinkSync(path.join(logDir, file));
      }
    });
  });

  describe('Node.js Environment', () => {
    it('logs messages at different levels', () => {
      expect(() => {
        logger.error(testMessage, testContext);
        logger.warn(testMessage, testContext);
        logger.info(testMessage, testContext);
        logger.debug(testMessage, testContext);
      }).not.toThrow();
    });

    it('logs errors with stack traces', () => {
      const testError = new Error('Test error');
      expect(() => {
        logger.error('Error occurred', {
          error: testError.message,
          stack: testError.stack,
        });
      }).not.toThrow();
    });

    it('handles undefined context', () => {
      expect(() => {
        logger.error(testMessage);
        logger.warn(testMessage);
        logger.info(testMessage);
        logger.debug(testMessage);
      }).not.toThrow();
    });

    it('handles circular references', () => {
      const circular = { a: 1 };
      circular.self = circular;

      expect(() => {
        logger.info('Circular reference test', circular);
      }).not.toThrow();
    });

    it('creates log files', () => {
      // Log some test messages
      logger.error('test-error');
      logger.warn('test-warn');
      logger.info('test-info');
      logger.debug('test-debug');

      // Check log files exist
      const files = fs.readdirSync(logDir);
      const logFiles = files.filter((file) => file.endsWith('.log'));
      expect(logFiles.length).toBeGreaterThan(0);

      // Verify log file contents
      const todayDate = new Date().toISOString().split('T')[0];
      const errorLogFile = path.join(logDir, `error-${todayDate}.log`);
      const warnLogFile = path.join(logDir, `warn-${todayDate}.log`);
      const infoLogFile = path.join(logDir, `info-${todayDate}.log`);
      const debugLogFile = path.join(logDir, `debug-${todayDate}.log`);

      expect(fs.existsSync(errorLogFile)).toBe(true);
      expect(fs.existsSync(warnLogFile)).toBe(true);
      expect(fs.existsSync(infoLogFile)).toBe(true);
      expect(fs.existsSync(debugLogFile)).toBe(true);
    });

    it('formats log messages correctly', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const testData = { key: 'value' };

      logger.info('Test message', testData);

      expect(spy).toHaveBeenCalled();
      const loggedMessage = spy.mock.calls[0][0];
      expect(typeof loggedMessage).toBe('string');
      const parsedMessage = JSON.parse(loggedMessage);
      expect(parsedMessage).toHaveProperty('timestamp');
      expect(parsedMessage).toHaveProperty('level', 'info');
      expect(parsedMessage).toHaveProperty('message', 'Test message');
      expect(parsedMessage).toHaveProperty('meta');
      expect(parsedMessage.meta).toHaveProperty('key', 'value');

      spy.mockRestore();
    });

    it('includes timestamps in log messages', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();

      logger.info('Test message');

      expect(spy).toHaveBeenCalled();
      const loggedMessage = spy.mock.calls[0][0];
      const parsedMessage = JSON.parse(loggedMessage);
      // Match ISO date format
      expect(parsedMessage.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      spy.mockRestore();
    });
  });

  describe('Browser Environment Mock', () => {
    let originalWindow;
    let mockFetch;

    beforeAll(() => {
      originalWindow = global.window;
      mockFetch = jest.fn(() => Promise.resolve());
      global.window = { fetch: mockFetch };
      global.fetch = mockFetch;
    });

    afterAll(() => {
      global.window = originalWindow;
      global.fetch = undefined;
    });

    it('logs to console in browser environment', () => {
      const consoleSpy = {
        error: jest.spyOn(console, 'error').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        info: jest.spyOn(console, 'info').mockImplementation(),
        debug: jest.spyOn(console, 'debug').mockImplementation(),
      };

      logger.error('Browser error', { test: true });
      logger.warn('Browser warning', { test: true });
      logger.info('Browser info', { test: true });
      logger.debug('Browser debug', { test: true });

      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.debug).toHaveBeenCalled();

      Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
    });

    it('sends logs to backend in browser environment', () => {
      logger.info('Test browser log');

      expect(mockFetch).toHaveBeenCalledWith('/api/log', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });
  });
});
