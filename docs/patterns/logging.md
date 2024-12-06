# Logging Patterns

## System Architecture

Our logging system is built on three key pillars:

1. **Type Safety**: All logging operations are fully typed
2. **Context Management**: Hierarchical context passing
3. **Error Handling**: Standardized error capture and propagation

### Import Paths

Core components are located at:

```typescript
// Core logging components
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../logging/logger.adapter';

// Types
import type { 
  Logger, 
  LogMetadata, 
  LogContext 
} from '../../../types/logger';
import { ApiError } from '../../../types/error';
```

Note: Adjust the relative paths based on your file location. The components are located at:

```text
- LoggingManager: src/server/managers/LoggingManager
- LoggerAdapter: src/server/utils/logging/logger.adapter
- Logger types: src/types/logger
- Error types: src/types/error
```

### Component Hierarchy

```text
LoggingManager (Singleton)
│
├── Manages global configuration
│   ├── Log levels
│   ├── Output formats
│   └── Transport configuration
│
└── LoggerAdapter (Per Service/Component)
    │
    ├── Component-specific context
    │   ├── Service name
    │   ├── Component name
    │   └── Operation context
    │
    └── Error handling integration
        ├── ApiError handling
        ├── Stack trace capture
        └── Metadata merging
```

### LoggingManager

- Global singleton managing core logging infrastructure
- NEVER use directly in application code
- Responsible for:
  - Transport configuration (console, file, remote)
  - Global log level management
  - Format standardization
  - Performance optimization

### LoggerAdapter

- Primary interface for all application logging
- Creates type-safe logging context
- Manages metadata inheritance
- Handles error transformation
- Used via dependency injection or factory methods

### ApiError Integration

- Custom error type with rich metadata support
- Carries additional context through error chain
- Integrates with LoggerAdapter for consistent logging
- Properties:
  - message: Error description
  - cause: Original error or cause
  - metadata: Additional context
  - status: HTTP status code

## Initialization

LoggingManager follows the singleton pattern with dependency injection support:

```typescript
// 1. Get singleton instance
const logger = LoggingManager.getInstance();

// 2. With dependencies (for testing/DI)
const logger = LoggingManager.getInstance({
  configManager,
  metricsManager
});

// 3. In services, always use LoggerAdapter
const logger = new LoggerAdapter(LoggingManager.getInstance(), {
  component: 'YourService',
  service: 'ServiceCategory'
});
```

Key Points:

- LoggingManager is a singleton - use getInstance()
- Services should never use LoggingManager directly
- Always wrap with LoggerAdapter for type safety and context
- Provide component and service names for proper categorization

## Implementation Guide

### 1. Service Setup

Always follow this pattern in service classes:

```typescript
export class YourService {
  private readonly logger: Logger;

  constructor(logManager?: LoggingManager) {
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, { 
      component: 'YourService',
      service: 'ServiceCategory' // Optional: broader service category
    });
  }
}
```

### 2. Method-Level Logging

For each method, create a context-specific logger:

```typescript
async processItem(itemId: string, options: ProcessOptions): Promise<void> {
  // Create method-specific logger with context
  const logger = this.logger.withContext({ 
    itemId,
    operation: 'processItem'
  });

  try {
    logger.info('Processing item started', { options });
    
    // Your processing logic here
    
    logger.info('Processing item completed', {
      duration: processingTime,
      result: 'success'
    });
  } catch (error: unknown) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : String(error),
      options,
      state: 'failed'
    };
    logger.error('Processing item failed', metadata);
    throw error; // Re-throw or handle as needed
  }
}
```

### 3. Log Level Usage

#### error

Use for actionable errors that need attention:

```typescript
logger.error('Database connection failed', {
  error: err.message,
  connectionId: conn.id,
  retryCount: attempts
});
```

#### warn

Use for concerning but non-critical issues:

```typescript
logger.warn('Rate limit approaching', {
  currentRate: rate,
  limit: maxRate,
  userId: user.id
});
```

#### info

Use for important operations and state changes:

```typescript
logger.info('User preferences updated', {
  userId: user.id,
  changes: ['theme', 'language'],
  source: 'api'
});
```

#### debug

Use for detailed troubleshooting information:

```typescript
logger.debug('Cache lookup details', {
  key: cacheKey,
  found: exists,
  age: entryAge,
  size: dataSize
});
```

#### critical

Use for severe issues needing immediate action:

```typescript
logger.critical('System disk space critically low', {
  freeSpace: space,
  path: diskPath,
  notify: true // Triggers immediate notification
});
```

### 4. Context Management

#### Basic Context

```typescript
const logger = this.logger.withContext({
  component: 'UserManager',
  userId: user.id
});
```

#### Request Context

```typescript
const requestLogger = this.logger.withContext({
  requestId: req.id,
  method: req.method,
  path: req.path,
  userId: req.user?.id
});
```

#### Nested Context

```typescript
// Base context
const logger = this.logger.withContext({ operation: 'backup' });

// Add more context
const jobLogger = logger.withContext({ 
  jobId: job.id,
  targetPath: job.path
});
```

### 5. Error Handling Pattern

The error handling pattern is designed to capture complete error context while maintaining type safety:

```typescript
try {
  await someOperation();
} catch (error: unknown) {
  // Step 1: Create base metadata with error info
  const metadata: LogMetadata = {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    operation: 'operationName',
    component: 'YourComponent',
    // Add relevant context
    userId: user.id,
    resourceId: resource.id
  };
  
  // Step 2: Handle ApiError special cases
  if (error instanceof ApiError) {
    // Include error chain
    metadata.cause = error.cause;
    
    // Merge ApiError metadata while preserving existing context
    if (error.metadata) {
      Object.assign(metadata, error.metadata);
    }
  }
  
  // Step 3: Log with complete context
  logger.error('Operation failed', metadata);
  
  // Step 4: Error propagation
  throw error; // Or handle appropriately
}
```

#### Error Handling Best Practices

1. **Type Safety**
   - Always check error types with instanceof
   - Use unknown type for caught errors
   - Properly type metadata objects

2. **Context Preservation**
   - Include component and operation names
   - Preserve error cause chain
   - Maintain request context

3. **Metadata Management**
   - Use Object.assign for metadata merging
   - Don't override existing context
   - Include all relevant IDs

4. **Error Propagation**
   - Log before throwing
   - Maintain error chain
   - Add context at each level

### 6. Performance Logging

```typescript
const startTime = Date.now();
const logger = this.logger.withContext({ operation: 'longOperation' });

try {
  logger.info('Operation started');
  await someOperation();
  
  const duration = Date.now() - startTime;
  logger.info('Operation completed', {
    duration,
    timing: {
      total: duration,
      processing: processingTime,
      db: dbTime
    }
  });
} catch (error) {
  const duration = Date.now() - startTime;
  logger.error('Operation failed', {
    error,
    duration,
    timing: {
      total: duration,
      processing: processingTime,
      db: dbTime
    }
  });
}
```

## Configuration

The logging system is configured via a type-safe schema:

```typescript
const LoggingConfigSchema = z.object({
  level: z.enum([
    'error', 
    'warn', 
    'info', 
    'http', 
    'verbose', 
    'debug', 
    'silly'
  ]).default('info'),
  format: z.enum(['json', 'simple', 'pretty']).default('json'),
  console: z.object({
    enabled: z.boolean().default(true),
    level: z.enum([
      'error', 
      'warn', 
      'info', 
      'http', 
      'verbose', 
      'debug', 
      'silly'
    ]).optional()
  }).default({}),
  file: z.object({
    enabled: z.boolean().default(true),
    filename: z.string(),
    maxSize: z.number()
      .min(1024)
      .max(1024 * 1024 * 100)
      .default(10485760), // 10MB
    maxFiles: z.number().min(1).max(30).default(7),
    level: z.enum([
      'error', 
      'warn', 
      'info', 
      'http', 
      'verbose', 
      'debug', 
      'silly'
    ]).optional()
  }).default({}),
  metadata: z.object({
    service: z.boolean().default(true),
    timestamp: z.boolean().default(true),
    requestId: z.boolean().default(true),
    userId: z.boolean().default(false)
  }).default({})
});
```

## Metrics and Monitoring

The logging system automatically tracks key metrics:

- Log entry counts by level (info, warn, error)
- Logging latency
- Log file sizes
- Health status

These metrics are available through the MetricsManager for monitoring and alerting.

## Dependencies

LoggingManager depends on:

- ConfigManager: For configuration management
- MetricsManager: For metrics collection
- Winston: For underlying logging implementation

## Best Practices

### DO

- Always use LoggerAdapter, never LoggingManager directly
- Include operation name in context
- Use type-safe metadata
- Structure error information consistently
- Add timing for long-running operations
- Use appropriate log levels
- Include all relevant IDs (user, request, resource)

### DON'T

- Log sensitive information (passwords, tokens)
- Use string interpolation for messages
- Log full objects (select relevant fields)
- Create new loggers without context
- Mix logging patterns within a service
- Catch errors without logging them

### Testing

```typescript
describe('YourService', () => {
  let mockLogger: jest.Mocked<Logger>;
  
  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      critical: jest.fn(),
      withContext: jest.fn().mockReturnThis()
    };
  });

  it('logs operation result', async () => {
    const service = new YourService(mockLogger);
    await service.someOperation();
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Operation completed',
      expect.objectContaining({
        operation: 'someOperation',
        duration: expect.any(Number)
      })
    );
  });
});

## Types

```typescript
// Defines structure for all logging context
interface LogContext {
  requestId?: string;
  userId?: string;
  hostId?: string;
  component: string;  // Required for all loggers
  service?: string;   // Optional service category
  [key: string]: unknown;
}

// Extends LogContext with error-specific fields
interface LogMetadata extends LogContext {
  error?: string;
  stack?: string;
  cause?: unknown;
  status?: number;
  path?: string;
  method?: string;
  timing?: {
    total?: number;
    db?: number;
    processing?: number;
  };
  [key: string]: unknown;
}

// Core logging interface implemented by LoggerAdapter
interface Logger {
  error(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  withContext(context: LogContext): Logger;
  critical(message: string, metadata?: LogMetadata & { notify?: boolean }): void;
}
