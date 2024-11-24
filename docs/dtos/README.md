# Data Transfer Objects (DTOs) Documentation

This documentation covers the implementation, testing, and usage of our base DTOs. These DTOs form the foundation of our data transfer layer, ensuring type safety, validation, and consistent data structures across the application.

## Table of Contents
1. [Overview](#overview)
2. [Base DTOs](#base-dtos)
3. [Testing Coverage](./testing.md)
4. [Performance Metrics](./performance.md)
5. [Integration Scenarios](./integration.md)

## Overview

Our DTO implementation follows these key principles:
- Type safety through TypeScript and class-validator
- Consistent validation across the application
- Efficient serialization/deserialization
- Comprehensive test coverage
- Performance optimization

## Base DTOs

### BaseEntityDto
Core entity structure with standard fields:
- `id`: Unique identifier (UUID)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `version`: Entity version for optimistic locking

### BaseResponseDto
Generic response wrapper:
- `success`: Operation result status
- `data`: Response payload
- `error`: Error details if failure
- `timestamp`: Response timestamp

### BaseErrorDto
Error handling structure:
- `code`: Error code
- `message`: Error message
- `details`: Additional error context
- `severity`: Error severity level

### BaseTimeRangeDto
Time range representation:
- `startDate`: Range start
- `endDate`: Range end
- `timezone`: Timezone specification

### BaseNotificationDto
Notification structure:
- `id`: Notification ID
- `type`: Notification type
- `title`: Notification title
- `message`: Notification content
- `severity`: Notification severity
- `metadata`: Additional context

### BaseSearchDto
Search parameters structure:
- `page`: Page number
- `limit`: Items per page
- `sortBy`: Sort field
- `sortOrder`: Sort direction
- `filters`: Search filters

### BaseValidationDto
Validation result structure:
- `isValid`: Validation status
- `errors`: Validation errors
- `context`: Validation context

### BaseRequestDto
Request wrapper with context:
- `requestId`: Request identifier
- `userContext`: User information
- `tenantContext`: Tenant information
- `settings`: Request settings
- `metadata`: Additional request data

## Usage Guidelines

### Basic Usage
```typescript
// Creating a response with data
const response = new BaseResponseDto({
  success: true,
  data: {
    items: [/* data items */],
    total: 10
  }
});

// Handling errors
const errorResponse = new BaseResponseDto({
  success: false,
  error: new BaseErrorDto({
    code: 'VALIDATION_ERROR',
    message: 'Invalid input'
  })
});
```

### Validation
All DTOs include built-in validation using class-validator:
```typescript
const dto = new BaseRequestDto({/*...*/});
const errors = await validate(dto);
if (errors.length > 0) {
  // Handle validation errors
}
```

### Type Safety
TypeScript provides full type safety and IDE support:
```typescript
interface UserData {
  id: string;
  name: string;
}

const response = new BaseResponseDto<UserData>({
  success: true,
  data: {
    id: '123',
    name: 'John'
  }
});
```

## Next Steps
- Review the [Testing Coverage](./testing.md) documentation
- Check [Performance Metrics](./performance.md)
- Explore [Integration Scenarios](./integration.md)
