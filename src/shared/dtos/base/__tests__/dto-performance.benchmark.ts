import { BaseEntityDto } from '../base-entity.dto';
import { BaseResponseDto } from '../base-response.dto';
import { BaseErrorDto } from '../base-error.dto';
import { BaseTimeRangeDto } from '../base-time-range.dto';
import { BaseNotificationDto } from '../base-notification.dto';
import { BaseSearchDto } from '../base-search.dto';
import { BaseValidationDto, ValidationError, ValidationSeverity } from '../base-validation.dto';
import { BaseRequestDto, UserContext, TenantContext, RequestSettings } from '../base-request.dto';
import { validate } from 'class-validator';

// Utility function to measure execution time
const measureExecutionTime = async (fn: () => Promise<void> | void): Promise<number> => {
  const start = process.hrtime();
  await fn();
  const [seconds, nanoseconds] = process.hrtime(start);
  return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
};

describe('DTO Performance Benchmarks', () => {
  const ITERATIONS = 1000;
  const MAX_INSTANTIATION_TIME = 1; // ms
  const MAX_VALIDATION_TIME = 5; // ms
  const MAX_SERIALIZATION_TIME = 1; // ms

  describe('BaseEntityDto', () => {
    it(`should instantiate ${ITERATIONS} times within ${MAX_INSTANTIATION_TIME}ms per instance`, async () => {
      const avgTime = await measureExecutionTime(async () => {
        for (let i = 0; i < ITERATIONS; i++) {
          new BaseEntityDto({
            id: '123e4567-e89b-12d3-a456-426614174000',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1
          });
        }
      }) / ITERATIONS;

      expect(avgTime).toBeLessThan(MAX_INSTANTIATION_TIME);
    });

    it(`should validate ${ITERATIONS} times within ${MAX_VALIDATION_TIME}ms per instance`, async () => {
      const dto = new BaseEntityDto({
        id: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      });

      const avgTime = await measureExecutionTime(async () => {
        for (let i = 0; i < ITERATIONS; i++) {
          await validate(dto);
        }
      }) / ITERATIONS;

      expect(avgTime).toBeLessThan(MAX_VALIDATION_TIME);
    });
  });

  describe('BaseResponseDto', () => {
    it(`should handle complex data operations within time limits`, async () => {
      const avgTime = await measureExecutionTime(async () => {
        for (let i = 0; i < ITERATIONS; i++) {
          const response = new BaseResponseDto({
            success: true,
            data: { key: 'value', nested: { array: [1, 2, 3] } },
            timestamp: new Date()
          });
          await validate(response);
          JSON.stringify(response);
        }
      }) / ITERATIONS;

      expect(avgTime).toBeLessThan(MAX_VALIDATION_TIME + MAX_SERIALIZATION_TIME);
    });
  });

  describe('BaseTimeRangeDto', () => {
    it(`should handle date operations efficiently`, async () => {
      const avgTime = await measureExecutionTime(async () => {
        for (let i = 0; i < ITERATIONS; i++) {
          const timeRange = new BaseTimeRangeDto({
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            timezone: 'UTC'
          });
          await validate(timeRange);
        }
      }) / ITERATIONS;

      expect(avgTime).toBeLessThan(MAX_VALIDATION_TIME);
    });
  });

  describe('BaseSearchDto', () => {
    it(`should handle search parameters efficiently`, async () => {
      const avgTime = await measureExecutionTime(async () => {
        for (let i = 0; i < ITERATIONS; i++) {
          const search = new BaseSearchDto({
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
            filters: { status: 'active', type: ['A', 'B'] }
          });
          await validate(search);
        }
      }) / ITERATIONS;

      expect(avgTime).toBeLessThan(MAX_VALIDATION_TIME);
    });
  });

  describe('BaseValidationDto', () => {
    it(`should handle multiple validation errors efficiently`, async () => {
      const avgTime = await measureExecutionTime(async () => {
        for (let i = 0; i < ITERATIONS; i++) {
          const validation = new BaseValidationDto({
            isValid: false,
            errors: Array(10).fill(null).map(() => new ValidationError({
              field: 'test',
              message: 'test message',
              severity: ValidationSeverity.ERROR
            }))
          });
          await validate(validation);
        }
      }) / ITERATIONS;

      expect(avgTime).toBeLessThan(MAX_VALIDATION_TIME);
    });
  });

  describe('BaseRequestDto', () => {
    it(`should handle complex nested objects efficiently`, async () => {
      const avgTime = await measureExecutionTime(async () => {
        for (let i = 0; i < ITERATIONS; i++) {
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
            },
            settings: {
              priority: 'HIGH',
              timeoutMs: 5000
            }
          });
          await validate(request);
          JSON.stringify(request);
        }
      }) / ITERATIONS;

      expect(avgTime).toBeLessThan(MAX_VALIDATION_TIME + MAX_SERIALIZATION_TIME);
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory footprint for bulk operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create an array of 10000 mixed DTOs
      const dtos = [];
      for (let i = 0; i < 10000; i++) {
        switch (i % 6) {
          case 0:
            dtos.push(new BaseEntityDto({ id: '123e4567-e89b-12d3-a456-426614174000' }));
            break;
          case 1:
            dtos.push(new BaseResponseDto({ success: true, data: { test: 'data' } }));
            break;
          case 2:
            dtos.push(new BaseTimeRangeDto({ startDate: new Date(), endDate: new Date() }));
            break;
          case 3:
            dtos.push(new BaseSearchDto({ page: 1, limit: 10 }));
            break;
          case 4:
            dtos.push(new BaseValidationDto({ isValid: true, errors: [] }));
            break;
          case 5:
            dtos.push(new BaseRequestDto({ requestId: '123e4567-e89b-12d3-a456-426614174000' }));
            break;
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryPerDto = (finalMemory - initialMemory) / 10000 / 1024; // KB per DTO

      // Each DTO should use less than 2KB on average
      expect(memoryPerDto).toBeLessThan(2);
    });
  });

  describe('Serialization Performance', () => {
    it('should serialize and deserialize efficiently', async () => {
      const dtos = {
        entity: new BaseEntityDto({ id: '123e4567-e89b-12d3-a456-426614174000' }),
        response: new BaseResponseDto({ success: true, data: { test: 'data' } }),
        timeRange: new BaseTimeRangeDto({ startDate: new Date(), endDate: new Date() }),
        search: new BaseSearchDto({ page: 1, limit: 10 }),
        validation: new BaseValidationDto({ isValid: true, errors: [] }),
        request: new BaseRequestDto({ requestId: '123e4567-e89b-12d3-a456-426614174000' })
      };

      const avgTime = await measureExecutionTime(async () => {
        for (let i = 0; i < ITERATIONS; i++) {
          Object.values(dtos).forEach(dto => {
            const serialized = JSON.stringify(dto);
            JSON.parse(serialized);
          });
        }
      }) / ITERATIONS;

      expect(avgTime).toBeLessThan(MAX_SERIALIZATION_TIME);
    });
  });
});
