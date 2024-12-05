# Logging Patterns

## Overview

This guide documents our standard logging patterns and best practices.

## Implementation

### Logger Setup

```typescript
private readonly logger: Logger;

constructor() {
  const baseLogger = LoggingManager.getInstance();
  this.logger = new LoggerAdapter(baseLogger, { component: 'YourService' });
}
```

### Log Levels

- **error**: For errors needing attention (exceptions, failures)
- **warn**: For concerning but non-critical issues
- **info**: For important operations and state changes
- **debug**: For detailed troubleshooting
- **critical**: For severe issues needing immediate action

### Structured Metadata

Always include relevant context:

- operation: The specific operation being performed
- error: Error message or Error object for failures
- component: Service/component name
- relevant IDs (userId, hostId, etc.)
- performance metrics when applicable

Example:

```typescript
this.logger.error('Operation failed', {
  error: error instanceof Error ? error.message : String(error),
  operation: 'methodName',
  userId: '123',
  duration: 1234
});
```

### Error Handling

```typescript
try {
  await someOperation();
} catch (error: unknown) {
  this.logger.error('Operation failed', {
    error: error instanceof Error ? error.message : String(error),
    operation: 'operationName'
  });
  throw error;
}
```

### Context Handling

```typescript
// Add request context
const requestLogger = this.logger.withContext({
  requestId: '123',
  userId: '456'
});

// Use in operations
requestLogger.info('Processing request');
```

## Best Practices

### Use Appropriate Levels

- **error**: Unexpected failures
- **warn**: Non-critical issues
- **info**: State changes
- **debug**: Troubleshooting details
- **critical**: Immediate action needed

### Structure Metadata

Good:

```typescript
logger.info('User updated', {
  userId: '123',
  operation: 'updateUser',
  changes: ['email']
});
```

Bad:

```typescript
logger.info(`Updated user 123's email`);
```

### Security

- Never log sensitive data
- Mask PII when needed
- Validate external error messages
- Follow compliance requirements

### Performance

- Use debug for verbose logs
- Monitor production volume
- Include timing data
- Sample high-frequency events

## Common Patterns

### Request Logging

```typescript
const requestLogger = logger.withContext({
  requestId,
  method: req.method,
  path: req.path
});

try {
  requestLogger.info('Request started');
  // Process request
  requestLogger.info('Request completed', {
    duration,
    statusCode: 200
  });
} catch (error) {
  requestLogger.error('Request failed', {
    error,
    statusCode: 500
  });
}
```

### Background Jobs

```typescript
const jobLogger = logger.withContext({
  jobId,
  jobType: 'dataSync'
});

try {
  jobLogger.info('Job started');
  // Process job
  jobLogger.info('Job completed', {
    duration,
    itemsProcessed
  });
} catch (error) {
  jobLogger.error('Job failed', {
    error,
    lastStep
  });
}
```

### Testing

```typescript
describe('YourService', () => {
  it('logs operation result', async () => {
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    
    const service = new YourService(mockLogger);
    await service.someOperation();
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Operation completed',
      expect.objectContaining({
        operation: 'someOperation'
      })
    );
  });
});
