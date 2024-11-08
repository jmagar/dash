'use strict';

const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');

describe('Logger', () => {
  const logDir = path.join(__dirname, '../logs');
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
      if (file.includes('test-')) {
        fs.unlinkSync(path.join(logDir, file));
      }
    });
  });

  it('logs messages at different levels', () => {
    expect(() => {
      logger.error(testMessage, testContext);
      logger.warn(testMessage, testContext);
      logger.info(testMessage, testContext);
      logger.http(testMessage, testContext);
      logger.debug(testMessage, testContext);
    }).not.toThrow();
  });

  it('logs errors with stack traces', () => {
    const testError = new Error('Test error');
    expect(() => {
      logger.logError(testError, testContext);
    }).not.toThrow();
  });

  it('logs database queries', () => {
    const query = 'SELECT * FROM test';
    const duration = 50;
    const rowCount = 10;

    expect(() => {
      logger.logDatabase(query, duration, rowCount);
    }).not.toThrow();

    // Test slow query
    const slowDuration = 150;
    expect(() => {
      logger.logDatabase(query, slowDuration, rowCount);
    }).not.toThrow();
  });

  it('logs HTTP requests', () => {
    const mockReq = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      get: (header) => {
        const headers = {
          'user-agent': 'test-agent',
        };
        return headers[header];
      },
      user: {
        id: 123,
      },
    };

    expect(() => {
      logger.logRequest(mockReq, 'Test HTTP request');
    }).not.toThrow();
  });

  it('handles undefined context', () => {
    expect(() => {
      logger.error(testMessage);
      logger.warn(testMessage);
      logger.info(testMessage);
      logger.http(testMessage);
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
    const files = fs.readdirSync(logDir);
    const logFiles = files.filter((file) => file.endsWith('.log'));
    expect(logFiles.length).toBeGreaterThan(0);
  });

  it('formats log messages correctly', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const testData = { key: 'value' };

    logger.info('Test message', testData);

    expect(spy).toHaveBeenCalled();
    const loggedMessage = spy.mock.calls[0][0];
    expect(loggedMessage).toContain('Test message');
    expect(loggedMessage).toContain('key');
    expect(loggedMessage).toContain('value');

    spy.mockRestore();
  });

  it('includes timestamps in log messages', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();

    logger.info('Test message');

    expect(spy).toHaveBeenCalled();
    const loggedMessage = spy.mock.calls[0][0];
    // Match ISO date format
    expect(loggedMessage).toMatch(/\d{4}-\d{2}-\d{2}/);
    // Match time format
    expect(loggedMessage).toMatch(/\d{2}:\d{2}:\d{2}/);

    spy.mockRestore();
  });
});
