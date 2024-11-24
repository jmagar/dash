import { validate } from 'class-validator';
import { BaseErrorDto, ErrorSeverity, ErrorLocation } from '../base-error.dto';

describe('BaseErrorDto', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validErrorDto = {
    code: 'ERROR_CODE',
    category: 'Category',
    message: 'Test error message',
    severity: ErrorSeverity.ERROR
  };

  describe('Type Safety', () => {
    it('should enforce error code format', async () => {
      const invalidCodes = ['lowercase', 'With Space', '123_START_NUMBER', 'TOO_LONG'.repeat(10)];
      
      for (const code of invalidCodes) {
        const dto = new BaseErrorDto({
          ...validErrorDto,
          code
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const codeError = errors.find(e => e.property === 'code');
        expect(codeError).toBeDefined();
      }

      // Test valid code
      const dto = new BaseErrorDto({
        ...validErrorDto,
        code: 'VALID_ERROR_CODE'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should enforce category format', async () => {
      const invalidCategories = ['lowercase', 'With Space', '123Category', 'TooLong'.repeat(10)];
      
      for (const category of invalidCategories) {
        const dto = new BaseErrorDto({
          ...validErrorDto,
          category
        });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const categoryError = errors.find(e => e.property === 'category');
        expect(categoryError).toBeDefined();
      }

      // Test valid category
      const dto = new BaseErrorDto({
        ...validErrorDto,
        category: 'ValidCategory'
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should enforce message length constraints', async () => {
      const dto = new BaseErrorDto({
        ...validErrorDto,
        message: ''
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const messageError = errors.find(e => e.property === 'message');
      expect(messageError?.constraints).toHaveProperty('minLength');

      const longDto = new BaseErrorDto({
        ...validErrorDto,
        message: 'x'.repeat(1001)
      });
      const longErrors = await validate(longDto);
      expect(longErrors.length).toBeGreaterThan(0);
      const longMessageError = longErrors.find(e => e.property === 'message');
      expect(longMessageError?.constraints).toHaveProperty('maxLength');
    });

    it('should validate request and correlation IDs as UUIDs', async () => {
      const dto = new BaseErrorDto({
        ...validErrorDto,
        requestId: 'invalid-uuid',
        correlationId: 'invalid-uuid'
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(e => e.property === 'requestId')?.constraints).toHaveProperty('isUuid');
      expect(errors.find(e => e.property === 'correlationId')?.constraints).toHaveProperty('isUuid');
    });
  });

  describe('Error Location', () => {
    it('should validate error location structure', async () => {
      const dto = new BaseErrorDto({
        ...validErrorDto,
        location: new ErrorLocation({
          file: '',
          line: -1,
          column: -1,
          function: '',
          class: ''
        })
      });
      const errors = await validate(dto, { validationError: { target: false } });
      expect(errors.length).toBeGreaterThan(0);
      const locationErrors = errors.find(e => e.property === 'location');
      expect(locationErrors).toBeDefined();
    });

    it('should accept valid error location', async () => {
      const dto = new BaseErrorDto({
        ...validErrorDto,
        location: new ErrorLocation({
          file: '/path/to/file.ts',
          line: 42,
          column: 10,
          function: 'testFunction',
          class: 'TestClass',
          stackTrace: 'Error: Test error\n    at TestClass.testFunction (/path/to/file.ts:42:10)'
        })
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Default Values', () => {
    it('should set default severity to ERROR', () => {
      const dto = new BaseErrorDto({
        code: 'TEST_ERROR',
        category: 'TestCategory',
        message: 'Test message'
      });
      expect(dto.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should set default timestamp to current time', () => {
      const before = new Date();
      const dto = new BaseErrorDto({
        code: 'TEST_ERROR',
        category: 'TestCategory',
        message: 'Test message'
      });
      const after = new Date();
      
      const timestamp = new Date(dto.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Performance', () => {
    it('should validate within 1ms', async () => {
      const dto = new BaseErrorDto({
        code: 'PERF_TEST',
        category: 'Performance',
        message: 'Performance test error',
        severity: ErrorSeverity.ERROR,
        location: new ErrorLocation({
          file: '/path/to/file.ts',
          line: 1,
          column: 1
        })
      });

      const start = process.hrtime();
      await validate(dto);
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(milliseconds).toBeLessThan(1);
    });

    it('should have memory footprint less than 2KB', () => {
      const dto = new BaseErrorDto({
        code: 'MEM_TEST',
        category: 'Memory',
        message: 'Memory test error',
        severity: ErrorSeverity.ERROR,
        details: 'Detailed error information',
        location: new ErrorLocation({
          file: '/path/to/file.ts',
          line: 1,
          column: 1,
          function: 'testFunction',
          class: 'TestClass',
          stackTrace: 'Error: Test error\n    at TestClass.testFunction (/path/to/file.ts:1:1)'
        }),
        metadata: {
          test: 'value',
          number: 42
        }
      });

      const size = Buffer.byteLength(JSON.stringify(dto));
      expect(size).toBeLessThan(2048); // 2KB in bytes
    });
  });

  describe('Serialization', () => {
    it('should properly serialize and deserialize', () => {
      const original = new BaseErrorDto({
        code: 'TEST_ERROR',
        category: 'TestCategory',
        subcategory: 'TestSubcategory',
        message: 'Test error message',
        details: 'Detailed error information',
        severity: ErrorSeverity.WARNING,
        requestId: validUUID,
        correlationId: validUUID,
        location: new ErrorLocation({
          file: '/path/to/file.ts',
          line: 42,
          column: 10,
          function: 'testFunction',
          class: 'TestClass',
          stackTrace: 'Error: Test error\n    at TestClass.testFunction (/path/to/file.ts:42:10)'
        }),
        metadata: {
          key: 'value',
          nested: {
            array: [1, 2, 3]
          }
        }
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseErrorDto(JSON.parse(serialized));

      expect(deserialized.code).toBe(original.code);
      expect(deserialized.category).toBe(original.category);
      expect(deserialized.subcategory).toBe(original.subcategory);
      expect(deserialized.message).toBe(original.message);
      expect(deserialized.details).toBe(original.details);
      expect(deserialized.severity).toBe(original.severity);
      expect(deserialized.requestId).toBe(original.requestId);
      expect(deserialized.correlationId).toBe(original.correlationId);
      expect(deserialized.location?.file).toBe(original.location?.file);
      expect(deserialized.location?.line).toBe(original.location?.line);
      expect(deserialized.location?.function).toBe(original.location?.function);
      expect(deserialized.metadata).toEqual(original.metadata);
    });

    it('should handle optional fields correctly', () => {
      const original = new BaseErrorDto({
        code: 'TEST_ERROR',
        category: 'TestCategory',
        message: 'Test error message'
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseErrorDto(JSON.parse(serialized));

      expect(deserialized.subcategory).toBeUndefined();
      expect(deserialized.details).toBeUndefined();
      expect(deserialized.severity).toBe(ErrorSeverity.ERROR);
      expect(deserialized.requestId).toBeUndefined();
      expect(deserialized.correlationId).toBeUndefined();
      expect(deserialized.location).toBeUndefined();
      expect(deserialized.metadata).toBeUndefined();
    });
  });
});
