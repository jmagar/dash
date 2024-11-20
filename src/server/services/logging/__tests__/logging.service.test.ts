import { LoggingService } from '../logging.service';
import { logger } from '../../../utils/logger';

// Mock the base logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    withContext: jest.fn().mockReturnThis(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    critical: jest.fn()
  }
}));

describe('LoggingService', () => {
  let loggingService: LoggingService;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    loggingService = new LoggingService({ component: 'test' });
  });

  describe('logHostOperation', () => {
    it('should log successful host operations with timing', () => {
      const startTime = Date.now() - 1000; // 1 second ago
      
      loggingService.logHostOperation({
        operation: 'test-operation',
        hostId: 'test-host',
        success: true,
        startTime,
        metadata: { extra: 'data' }
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Host operation successful: test-operation',
        expect.objectContaining({
          hostId: 'test-host',
          operation: 'test-operation',
          success: true,
          timing: expect.objectContaining({
            total: expect.any(Number)
          }),
          extra: 'data',
          component: 'test'
        })
      );
    });

    it('should log failed host operations with error details', () => {
      const error = new Error('test error');
      const startTime = Date.now() - 1000;

      loggingService.logHostOperation({
        operation: 'test-operation',
        hostId: 'test-host',
        success: false,
        startTime,
        error,
        metadata: { extra: 'data' }
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Host operation failed: test-operation',
        expect.objectContaining({
          hostId: 'test-host',
          operation: 'test-operation',
          success: false,
          error: expect.objectContaining({
            message: 'test error',
            name: 'Error',
            stack: expect.any(String)
          })
        })
      );
    });
  });

  describe('logSSHOperation', () => {
    it('should log SSH operations with command details', () => {
      const startTime = Date.now() - 1000;

      loggingService.logSSHOperation({
        operation: 'execute',
        hostId: 'test-host',
        command: 'ls -la',
        success: true,
        startTime
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'SSH operation successful: execute',
        expect.objectContaining({
          hostId: 'test-host',
          operation: 'execute',
          command: 'ls -la',
          success: true,
          timing: expect.objectContaining({
            total: expect.any(Number)
          })
        })
      );
    });
  });

  describe('logStateTransition', () => {
    it('should log state transitions with reason', () => {
      loggingService.logStateTransition({
        hostId: 'test-host',
        fromState: 'inactive',
        toState: 'active',
        reason: 'agent connected'
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Host state transition: inactive -> active',
        expect.objectContaining({
          hostId: 'test-host',
          stateTransition: {
            from: 'inactive',
            to: 'active',
            reason: 'agent connected'
          }
        })
      );
    });
  });

  describe('logHealthCheck', () => {
    it('should log successful health checks', () => {
      loggingService.logHealthCheck({
        hostId: 'test-host',
        checks: [
          {
            name: 'disk',
            success: true,
            value: '80',
            threshold: '90'
          },
          {
            name: 'memory',
            success: true,
            value: '70',
            threshold: '85'
          }
        ]
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Health check passed',
        expect.objectContaining({
          hostId: 'test-host',
          healthChecks: expect.arrayContaining([
            expect.objectContaining({
              name: 'disk',
              success: true,
              value: '80',
              threshold: '90'
            })
          ])
        })
      );
    });

    it('should log failed health checks with warnings', () => {
      const error = new Error('disk full');
      
      loggingService.logHealthCheck({
        hostId: 'test-host',
        checks: [
          {
            name: 'disk',
            success: false,
            value: '95',
            threshold: '90',
            error
          }
        ]
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Health check failed',
        expect.objectContaining({
          hostId: 'test-host',
          healthChecks: [
            expect.objectContaining({
              name: 'disk',
              success: false,
              value: '95',
              threshold: '90',
              error: expect.objectContaining({
                message: 'disk full',
                name: 'Error'
              })
            })
          ]
        })
      );
    });
  });

  describe('context propagation', () => {
    it('should create child loggers with merged context', () => {
      const childLogger = loggingService.child({
        requestId: 'test-request'
      });

      childLogger.info('test message');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'test message',
        expect.objectContaining({
          component: 'test',
          requestId: 'test-request'
        })
      );
    });
  });
});
