# DTO Hierarchy Documentation

## Base DTOs

### Core Base DTOs
```typescript
BaseEntityDto
├── id: string (UUID)
├── tenantId: string (UUID)
├── audit: AuditInfo
├── version?: number
├── isActive?: boolean
├── tags?: string[]
└── metadata?: Record<string, unknown>

BaseResponseDto<T>
├── success: boolean
├── data?: T
├── message?: string
└── timestamp: string

BaseErrorDto
├── code: string
├── category: string
├── subcategory?: string
├── message: string
├── details?: string
├── severity: 'ERROR' | 'WARNING' | 'INFO'
├── timestamp: string
├── requestId?: string
├── correlationId?: string
├── location?: ErrorLocation
└── metadata?: Record<string, unknown>
```

### Specialized Base DTOs
```typescript
BaseTimeRangeDto
├── startDate: Date
├── endDate: Date
├── timezone?: string
└── granularity?: string

BaseNotificationDto
├── type: NotificationType
├── priority: NotificationPriority
├── title: string
├── message: string
├── recipients: string[]
├── status: NotificationStatus
├── createdAt: Date
├── expiresAt?: Date
├── isRead: boolean
├── actionUrl?: string
└── metadata?: Record<string, any>

BaseSearchDto
├── query?: string
├── page: number
├── limit: number
├── sort?: SortOption[]
├── fields?: string[]
└── filters?: string

BaseValidationDto
├── isValid: boolean
├── errors: ValidationError[]
└── context?: string

BaseRequestDto
├── requestId?: string
├── clientTimestamp?: string
├── clientVersion?: string
├── source?: string
├── userContext?: UserContext
├── tenantContext?: TenantContext
├── settings?: RequestSettings
└── metadata?: Record<string, unknown>
```

## Validation Infrastructure

### Custom Decorators
```typescript
@IsValidTenantId()
@IsValidMetadata()
@IsUUID()
@IsIpAddress()
```

### Validation Pipe
```typescript
DtoValidationPipe
├── transform(value: any, metadata: ArgumentMetadata)
├── toValidate(metatype: Function): boolean
└── formatErrors(errors: any[]): string
```

### Transformer Utilities
```typescript
TransformToDate()
TransformToBoolean()
defaultTransformOptions
```

## Quality Metrics
- Type Coverage: 100%
- No any types allowed
- Strict null checks enabled
- No implicit any
- Validation time: < 1ms per DTO
- Memory footprint: < 2KB per DTO instance
- Build impact: < 2%
- Unit test coverage: 100%
- Integration test coverage: 95%
- Performance tests required
- Type safety tests required
