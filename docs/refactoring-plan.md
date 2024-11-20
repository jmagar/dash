# SSH Helper (SHH) Refactoring Plan - Updated

## Code Duplication Analysis

### 1. Client-Side Duplication (1 week)

#### Error Handling Patterns
- Multiple implementations of error handling in API clients
- Duplicate error transformation logic
- Repeated logging patterns

Files to Update:
```
src/client/api/*.client.ts
- Create unified error handling HOC
- Implement shared error transformation
- Standardize error logging

src/client/hooks/useApi.ts
- Centralize retry logic
- Add shared loading states
- Implement error state management
```

#### Authentication Logic
- Duplicated token management
- Repeated auth header handling
- Multiple auth state implementations

Files to Update:
```
src/client/context/AuthContext.tsx
src/client/api/auth.client.ts
- Create unified auth management
- Implement shared token handling
- Centralize auth state logic
```

### 2. Server-Side Duplication (2 weeks)

#### Service Layer Patterns
- Multiple implementations of retry logic
- Duplicated error handling in services
- Repeated event emission patterns

Files to Update:
```
src/server/services/base.service.ts
- Enhance base service capabilities
- Add shared retry mechanisms
- Implement unified error handling

src/server/services/*/*.service.ts
- Refactor to use base service
- Remove duplicated patterns
- Standardize event handling
```

#### Cache Layer Patterns
- Duplicated Redis error handling
- Multiple cache key management
- Repeated connection logic

Files to Update:
```
src/server/cache/BaseRedisService.ts
- Enhance base cache capabilities
- Add unified key management
- Implement shared error handling

src/server/cache/*.ts
- Refactor to use base service
- Remove duplicated Redis logic
- Standardize cache operations
```

### 3. Shared Updates (1 week)

#### Type Definitions
- Duplicated interface definitions
- Repeated utility types
- Multiple error type definitions

Files to Update:
```
src/types/*.ts
- Create shared type definitions
- Remove duplicated interfaces
- Implement unified error types
```

#### Configuration Management
- Multiple config validation patterns
- Duplicated environment handling
- Repeated default configurations

Files to Update:
```
src/server/config.ts
src/client/config.ts
- Create unified config management
- Implement shared validation
- Standardize environment handling
```

## Implementation Strategy

### 1. Client Refactoring
```typescript
// src/client/api/base.client.ts
export class BaseApiClient {
  protected async request<T>(config: RequestConfig): Promise<T> {
    return this.withErrorHandling(async () => {
      // Unified request logic
    });
  }

  protected withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    // Shared error handling
  }
}

// src/client/hooks/useApi.ts
export function useApi<T>(apiCall: () => Promise<T>) {
  // Unified API hook with loading, error states
}
```

### 2. Server Refactoring
```typescript
// src/server/services/base.service.ts
export abstract class BaseService {
  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    // Unified retry logic
  }

  protected handleError(error: unknown): void {
    // Shared error handling
  }
}

// src/server/cache/BaseRedisService.ts
export abstract class BaseRedisService {
  protected async withConnection<T>(operation: () => Promise<T>): Promise<T> {
    // Unified connection handling
  }
}
```

### 3. Shared Types
```typescript
// src/types/common.ts
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

export interface ServiceError {
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
}
```

## Success Metrics

### 1. Code Reduction
- 40% reduction in error handling code
- 50% reduction in duplicated types
- 30% reduction in configuration code

### 2. Maintainability
- Single source of truth for common patterns
- Consistent error handling across codebase
- Unified configuration management

### 3. Developer Experience
- Simplified service creation
- Standardized error handling
- Reduced boilerplate code

## Monitoring Updates

### 1. Error Tracking
```yaml
# monitoring/alert_rules.yml
- name: error_patterns
  rules:
  - alert: InconsistentErrorHandling
    expr: error_handling_inconsistency > 0
    for: 5m
    labels:
      severity: warning
```

### 2. Performance Metrics
```yaml
# monitoring/alert_rules.yml
- name: performance_patterns
  rules:
  - alert: ServiceDegradation
    expr: service_response_time > 1000
    for: 5m
    labels:
      severity: warning
```
