import { BaseEntityDto } from '../base-entity.dto';
import { BaseResponseDto } from '../base-response.dto';
import { BaseErrorDto } from '../base-error.dto';
import { BaseTimeRangeDto } from '../base-time-range.dto';
import { BaseNotificationDto } from '../base-notification.dto';
import { BaseSearchDto } from '../base-search.dto';
import { BaseValidationDto, ValidationError, ValidationSeverity } from '../base-validation.dto';
import { BaseRequestDto, UserContext, TenantContext, RequestSettings } from '../base-request.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('DTO Integration Tests', () => {
  describe('Search and Response Integration', () => {
    it('should handle paginated search with response wrapper', async () => {
      // Create a search request
      const searchDto = new BaseSearchDto({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        filters: { status: 'active' }
      });

      // Simulate found entities
      const entities = Array(5).fill(null).map((_, index) => new BaseEntityDto({
        id: `entity-${index}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      }));

      // Wrap in response
      const response = new BaseResponseDto({
        success: true,
        data: {
          items: entities,
          total: 5,
          page: searchDto.page,
          limit: searchDto.limit
        },
        timestamp: new Date()
      });

      // Validate the entire structure
      const errors = await validate(response);
      expect(errors).toHaveLength(0);

      // Test serialization/deserialization of the complete structure
      const serialized = JSON.stringify(response);
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
      
      expect(deserialized).toBeInstanceOf(BaseResponseDto);
      expect(deserialized.data.items[0]).toHaveProperty('id');
      expect(deserialized.data.total).toBe(5);
    });
  });

  describe('Request Validation Flow', () => {
    it('should handle complete request validation flow', async () => {
      // Create a request with user and tenant context
      const request = new BaseRequestDto({
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        clientTimestamp: new Date().toISOString(),
        userContext: {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          roles: ['admin'],
          permissions: ['read', 'write']
        },
        tenantContext: {
          tenantId: '123e4567-e89b-12d3-a456-426614174002',
          tenantType: 'enterprise'
        }
      });

      // Simulate validation
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

      // Create error response
      const errorResponse = new BaseResponseDto({
        success: false,
        error: new BaseErrorDto({
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions for the operation',
          details: validation
        })
      });

      // Validate the entire flow
      const errors = await validate(errorResponse);
      expect(errors).toHaveLength(0);

      // Test complete serialization cycle
      const serialized = JSON.stringify(errorResponse);
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

      expect(deserialized.success).toBe(false);
      expect(deserialized.error?.code).toBe('PERMISSION_DENIED');
      expect(deserialized.error?.details).toBeDefined();
    });
  });

  describe('Notification and TimeRange Integration', () => {
    it('should handle scheduled notifications with time ranges', async () => {
      // Create a time range for the notification
      const timeRange = new BaseTimeRangeDto({
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        timezone: 'UTC'
      });

      // Create a notification
      const notification = new BaseNotificationDto({
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'SCHEDULED_MAINTENANCE',
        title: 'System Maintenance',
        message: 'System will be under maintenance',
        severity: 'WARNING',
        metadata: {
          timeRange: timeRange,
          affectedServices: ['api', 'web']
        }
      });

      // Wrap in response
      const response = new BaseResponseDto({
        success: true,
        data: notification,
        timestamp: new Date()
      });

      // Validate the complete structure
      const errors = await validate(response);
      expect(errors).toHaveLength(0);

      // Test serialization of the complete structure
      const serialized = JSON.stringify(response);
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

      expect(deserialized.data).toBeDefined();
      expect(deserialized.data.type).toBe('SCHEDULED_MAINTENANCE');
      expect(deserialized.data.metadata.timeRange).toBeDefined();
    });
  });

  describe('Complex Search and Validation', () => {
    it('should handle complex search with validation and response', async () => {
      // Create a complex search request
      const searchRequest = new BaseRequestDto({
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        userContext: {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          roles: ['user']
        },
        settings: {
          priority: 'HIGH',
          detailed: true
        }
      });

      const searchDto = new BaseSearchDto({
        page: 1,
        limit: 25,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {
          dateRange: new BaseTimeRangeDto({
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000)
          }),
          status: ['active', 'pending'],
          type: 'maintenance'
        }
      });

      // Validate search parameters
      const validation = new BaseValidationDto({
        isValid: true,
        errors: []
      });

      // Create successful response with results
      const response = new BaseResponseDto({
        success: true,
        data: {
          results: Array(5).fill(null).map((_, index) => ({
            id: `result-${index}`,
            score: Math.random(),
            timestamp: new Date()
          })),
          metadata: {
            searchParams: searchDto,
            validation: validation
          }
        },
        requestId: searchRequest.requestId
      });

      // Validate the entire structure
      const errors = await validate(response);
      expect(errors).toHaveLength(0);

      // Test complete serialization cycle
      const serialized = JSON.stringify(response);
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

      expect(deserialized.success).toBe(true);
      expect(deserialized.data.results).toHaveLength(5);
      expect(deserialized.data.metadata.searchParams).toBeDefined();
      expect(deserialized.data.metadata.validation.isValid).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle nested error scenarios', async () => {
      // Create a failed request
      const request = new BaseRequestDto({
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        clientTimestamp: new Date().toISOString()
      });

      // Create validation errors
      const validationErrors = [
        new ValidationError({
          field: 'userContext',
          message: 'User context is required',
          severity: ValidationSeverity.ERROR
        }),
        new ValidationError({
          field: 'tenantContext',
          message: 'Tenant context is required',
          severity: ValidationSeverity.ERROR
        })
      ];

      // Create validation result
      const validation = new BaseValidationDto({
        isValid: false,
        errors: validationErrors
      });

      // Create error response
      const errorResponse = new BaseResponseDto({
        success: false,
        error: new BaseErrorDto({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validation
        }),
        requestId: request.requestId,
        timestamp: new Date()
      });

      // Validate the complete error structure
      const errors = await validate(errorResponse);
      expect(errors).toHaveLength(0);

      // Test error serialization
      const serialized = JSON.stringify(errorResponse);
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

      expect(deserialized.success).toBe(false);
      expect(deserialized.error?.details).toBeDefined();
      const validationResult = deserialized.error?.details as BaseValidationDto;
      expect(validationResult.errors).toHaveLength(2);
      expect(validationResult.errors[0].severity).toBe(ValidationSeverity.ERROR);
    });
  });
});
