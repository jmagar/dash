# DTO Integration Scenarios

This document details how our DTOs work together in various real-world scenarios, demonstrating their integration patterns and best practices.

## Common Integration Patterns

### 1. Search and Response Flow
```typescript
// 1. Create search request
const searchDto = new BaseSearchDto({
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
  filters: { status: 'active' }
});

// 2. Wrap results in response
const response = new BaseResponseDto({
  success: true,
  data: {
    items: entities,
    total: total,
    page: searchDto.page,
    limit: searchDto.limit
  }
});
```

### 2. Request Validation Flow
```typescript
// 1. Create request with context
const request = new BaseRequestDto({
  requestId: uuid(),
  userContext: {
    userId: 'user-123',
    roles: ['admin']
  }
});

// 2. Validate request
const validation = new BaseValidationDto({
  isValid: false,
  errors: [
    new ValidationError({
      field: 'permissions',
      message: 'Insufficient permissions',
      severity: ValidationSeverity.ERROR
    })
  ]
});

// 3. Create error response
const errorResponse = new BaseResponseDto({
  success: false,
  error: new BaseErrorDto({
    code: 'PERMISSION_DENIED',
    message: 'Insufficient permissions',
    details: validation
  })
});
```

### 3. Notification with Time Range
```typescript
// 1. Create time range
const timeRange = new BaseTimeRangeDto({
  startDate: new Date(),
  endDate: new Date(Date.now() + 86400000),
  timezone: 'UTC'
});

// 2. Create notification
const notification = new BaseNotificationDto({
  type: 'SCHEDULED_MAINTENANCE',
  title: 'System Maintenance',
  message: 'System will be under maintenance',
  severity: 'WARNING',
  metadata: { timeRange }
});
```

## Complex Integration Scenarios

### 1. Advanced Search with Validation

```typescript
async function performAdvancedSearch(searchParams: BaseSearchDto) {
  // 1. Create request context
  const request = new BaseRequestDto({
    requestId: uuid(),
    userContext: getCurrentUser(),
    settings: {
      priority: 'HIGH',
      detailed: true
    }
  });

  try {
    // 2. Validate search parameters
    const validation = await validateSearch(searchParams);
    if (!validation.isValid) {
      return new BaseResponseDto({
        success: false,
        error: new BaseErrorDto({
          code: 'INVALID_SEARCH',
          details: validation
        })
      });
    }

    // 3. Perform search
    const results = await searchService.search(searchParams);

    // 4. Return response
    return new BaseResponseDto({
      success: true,
      data: {
        results,
        metadata: {
          searchParams,
          validation
        }
      },
      requestId: request.requestId
    });
  } catch (error) {
    return handleError(error, request);
  }
}
```

### 2. Batch Processing with Progress

```typescript
async function processBatch(items: BaseEntityDto[]) {
  // 1. Create time range for operation
  const timeRange = new BaseTimeRangeDto({
    startDate: new Date(),
    endDate: new Date(Date.now() + 3600000)
  });

  // 2. Initialize progress
  let processed = 0;
  const total = items.length;

  // 3. Process items
  for (const item of items) {
    try {
      await processItem(item);
      processed++;

      // 4. Send progress notification
      await notifyProgress(new BaseNotificationDto({
        type: 'PROGRESS_UPDATE',
        title: 'Batch Processing',
        message: `Processed ${processed} of ${total} items`,
        metadata: {
          progress: (processed / total) * 100,
          timeRange
        }
      }));
    } catch (error) {
      // 5. Handle errors
      await handleProcessingError(item, error);
    }
  }

  // 6. Return final response
  return new BaseResponseDto({
    success: true,
    data: {
      processed,
      total,
      timeRange
    }
  });
}
```

## Best Practices

### 1. Consistent Error Handling
```typescript
function handleError(error: any, request: BaseRequestDto): BaseResponseDto {
  const validation = new BaseValidationDto({
    isValid: false,
    errors: [
      new ValidationError({
        field: error.field || 'general',
        message: error.message,
        severity: error.severity || ValidationSeverity.ERROR
      })
    ]
  });

  return new BaseResponseDto({
    success: false,
    error: new BaseErrorDto({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
      details: validation
    }),
    requestId: request.requestId
  });
}
```

### 2. Context Propagation
```typescript
async function propagateContext<T>(
  operation: (context: BaseRequestDto) => Promise<T>,
  context: BaseRequestDto
): Promise<BaseResponseDto<T>> {
  try {
    const result = await operation(context);
    return new BaseResponseDto({
      success: true,
      data: result,
      requestId: context.requestId
    });
  } catch (error) {
    return handleError(error, context);
  }
}
```

### 3. Validation Chaining
```typescript
async function validateWithContext(
  dto: any,
  context: BaseRequestDto
): Promise<BaseValidationDto> {
  const errors: ValidationError[] = [];

  // Basic validation
  const basicErrors = await validate(dto);
  errors.push(...basicErrors.map(toValidationError));

  // Context-specific validation
  if (context.userContext) {
    const permissionErrors = await validatePermissions(dto, context.userContext);
    errors.push(...permissionErrors);
  }

  return new BaseValidationDto({
    isValid: errors.length === 0,
    errors,
    context: context.requestId
  });
}
```

## Testing Integration Scenarios

See the [integration tests](../src/shared/dtos/base/__tests__/dto-integration.spec.ts) for complete examples of these scenarios in action.

To run integration tests:
```bash
npm test src/shared/dtos/base/__tests__/dto-integration.spec.ts
```
