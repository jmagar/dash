# Middleware Documentation

## Overview
This document describes the middleware components used in the Dash server application.

## Core Middleware Components

### 1. Validation Middleware (`validate.ts`)
- Validates incoming requests using class-validator
- Transforms and validates DTOs
- Provides detailed validation error responses
- Usage example:
```typescript
@ValidateBody(CreateUserDto)
async createUser(req: Request, res: Response) {
  // Body is validated and transformed
}
```

### 2. Rate Limiting (`rateLimit.ts`)
- API-wide rate limiting
- Specific limiters for authentication routes
- Heavy operation limiters
- Customizable window and max request settings

### 3. Logging (`logging.ts`)
- Request/response logging with correlation IDs
- Performance tracking
- Slow request detection
- Error logging with stack traces

### 4. Error Handling (`error.ts`)
- Global error handling
- Standardized error responses
- Detailed validation errors
- 404 handling
- Security error handling

## Security Features

### 1. Helmet Configuration
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- Frame protection
- XSS protection

### 2. CORS Settings
- Origin control
- Method restrictions
- Header allowances
- Credentials handling

## Best Practices

1. Middleware Order:
   ```typescript
   // 1. Security middleware
   app.use(helmet());
   app.use(cors());
   
   // 2. Request parsing
   app.use(express.json());
   
   // 3. Compression
   app.use(compression());
   
   // 4. Logging
   app.use(requestLogger);
   
   // 5. Rate limiting
   app.use(apiLimiter);
   
   // 6. Routes
   app.use('/api', routes);
   
   // 7. 404 handling
   app.use(notFoundHandler);
   
   // 8. Error handling
   app.use(errorHandler);
   ```

2. Error Response Format:
   ```typescript
   {
     success: false,
     message: string,
     statusCode: number,
     details?: ErrorDetail[]
   }
   ```

## Health Checks
- `/api/status/health` endpoint
- System metrics
- Process information
- Custom rate limiting

## Monitoring
- Request timing tracking
- Error rate monitoring
- Rate limit tracking
- Health check monitoring
