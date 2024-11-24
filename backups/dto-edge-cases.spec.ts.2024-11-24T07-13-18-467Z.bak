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

describe('DTO Edge Cases and Complex Scenarios', () => {
  describe('Circular Reference Handling', () => {
    it('should handle nested DTOs with circular references', async () => {
      // Create a notification that references a request that references the notification
      const request = new BaseRequestDto({
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        clientTimestamp: new Date().toISOString()
      });

      const notification = new BaseNotificationDto({
        id: '123e4567-e89b-12d3-a456-426614174001',
        type: 'REQUEST_UPDATE',
        title: 'Request Status Change',
        message: 'Request processing completed',
        metadata: { request }
      });

      request.metadata = { notification };

      // Test serialization
      const serialized = JSON.stringify(notification);
      const deserialized = plainToInstance(BaseNotificationDto, JSON.parse(serialized));

      expect(deserialized.metadata.request).toBeDefined();
      expect(deserialized.metadata.request.metadata.notification).toBeDefined();
    });
  });

  describe('Deep Nesting Limits', () => {
    it('should handle deeply nested DTOs within limits', async () => {
      // Create a deeply nested structure
      const createNestedTimeRange = (depth: number): BaseTimeRangeDto => {
        if (depth === 0) {
          return new BaseTimeRangeDto({
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000)
          });
        }

        return new BaseTimeRangeDto({
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          metadata: { nested: createNestedTimeRange(depth - 1) }
        });
      };

      const deeplyNested = createNestedTimeRange(10); // Test with 10 levels of nesting
      const response = new BaseResponseDto({
        success: true,
        data: deeplyNested
      });

      // Validate the structure
      const errors = await validate(response);
      expect(errors).toHaveLength(0);

      // Test serialization
      const serialized = JSON.stringify(response);
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
      expect(deserialized.data).toBeDefined();
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large arrays of DTOs efficiently', async () => {
      // Create a large array of entities
      const entities = Array(1000).fill(null).map((_, index) => new BaseEntityDto({
        id: `entity-${index}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        metadata: {
          tags: Array(10).fill(null).map((_, i) => `tag-${i}`),
          attributes: {
            key1: 'value1',
            key2: 'value2',
            key3: 'value3'
          }
        }
      }));

      const response = new BaseResponseDto({
        success: true,
        data: { entities }
      });

      // Test validation performance
      const startValidation = Date.now();
      const errors = await validate(response);
      const validationTime = Date.now() - startValidation;
      
      expect(errors).toHaveLength(0);
      expect(validationTime).toBeLessThan(1000); // Should validate 1000 entities in less than 1 second

      // Test serialization performance
      const startSerialization = Date.now();
      const serialized = JSON.stringify(response);
      const serializationTime = Date.now() - startSerialization;
      
      expect(serializationTime).toBeLessThan(100); // Should serialize in less than 100ms
    });
  });

  describe('Concurrent Validation', () => {
    it('should handle concurrent validation of multiple DTOs', async () => {
      const dtos = Array(10).fill(null).map((_, index) => ({
        request: new BaseRequestDto({
          requestId: `request-${index}`,
          clientTimestamp: new Date().toISOString()
        }),
        search: new BaseSearchDto({
          page: 1,
          limit: 10,
          filters: { index }
        }),
        timeRange: new BaseTimeRangeDto({
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000)
        })
      }));

      // Validate all DTOs concurrently
      const startTime = Date.now();
      const validationResults = await Promise.all(
        dtos.flatMap(dto => [
          validate(dto.request),
          validate(dto.search),
          validate(dto.timeRange)
        ])
      );

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(1000); // Should validate 30 DTOs concurrently in less than 1 second
      
      validationResults.forEach(errors => {
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from validation errors and maintain partial data', async () => {
      const searchDto = new BaseSearchDto({
        page: -1, // Invalid page number
        limit: 0, // Invalid limit
        sortBy: '', // Empty sort field
        filters: { valid: true }
      });

      // Validate and capture errors
      const errors = await validate(searchDto);
      expect(errors.length).toBeGreaterThan(0);

      // Create a response with partial valid data
      const response = new BaseResponseDto({
        success: false,
        error: new BaseErrorDto({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: new BaseValidationDto({
            isValid: false,
            errors: errors.map(error => new ValidationError({
              field: error.property,
              message: Object.values(error.constraints || {})[0],
              severity: ValidationSeverity.ERROR
            }))
          })
        }),
        data: {
          validFilters: searchDto.filters, // Keep valid part of the data
          originalRequest: searchDto
        }
      });

      // Validate the response structure
      const responseErrors = await validate(response);
      expect(responseErrors).toHaveLength(0);

      // Test that we can still access valid data
      expect(response.data.validFilters.valid).toBe(true);
    });
  });

  describe('Cross-DTO Validation', () => {
    it('should validate relationships between different DTOs', async () => {
      const timeRange = new BaseTimeRangeDto({
        startDate: new Date(),
        endDate: new Date(Date.now() - 86400000) // End date before start date
      });

      const notification = new BaseNotificationDto({
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'SCHEDULED_EVENT',
        title: 'Event',
        message: 'Event details',
        metadata: { timeRange }
      });

      // Custom cross-DTO validation
      const validateTimeRange = (timeRange: BaseTimeRangeDto): ValidationError[] => {
        const errors: ValidationError[] = [];
        if (timeRange.startDate > timeRange.endDate) {
          errors.push(new ValidationError({
            field: 'timeRange',
            message: 'End date must be after start date',
            severity: ValidationSeverity.ERROR
          }));
        }
        return errors;
      };

      // Perform cross-DTO validation
      const timeRangeErrors = validateTimeRange(timeRange);
      const validation = new BaseValidationDto({
        isValid: timeRangeErrors.length === 0,
        errors: timeRangeErrors
      });

      // Create response with cross-validation results
      const response = new BaseResponseDto({
        success: validation.isValid,
        error: validation.isValid ? undefined : new BaseErrorDto({
          code: 'INVALID_TIME_RANGE',
          message: 'Invalid time range in notification',
          details: validation
        }),
        data: validation.isValid ? notification : undefined
      });

      // Validate the final response
      const responseErrors = await validate(response);
      expect(responseErrors).toHaveLength(0);
      expect(response.success).toBe(false);
      expect(response.error?.details?.errors[0].message).toBe('End date must be after start date');
    });
  });
});
