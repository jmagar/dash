import { ValidationError, ValidationSeverity, BaseValidationDto } from '../base-validation.dto';
import { validate } from 'class-validator';

describe('BaseValidationDto', () => {
  describe('Constructor', () => {
    it('should create an instance with valid data', () => {
      const validationError = new ValidationError({
        field: 'username',
        message: 'Username is required',
        severity: ValidationSeverity.ERROR,
      });

      const dto = new BaseValidationDto({
        isValid: false,
        errors: [validationError],
        context: 'user registration',
      });

      expect(dto.isValid).toBe(false);
      expect(dto.errors).toHaveLength(1);
      expect(dto.context).toBe('user registration');
      expect(dto.errors[0]).toBeInstanceOf(ValidationError);
    });

    it('should initialize empty errors array when not provided', () => {
      const dto = new BaseValidationDto({
        isValid: true,
      });

      expect(dto.errors).toBeInstanceOf(Array);
      expect(dto.errors).toHaveLength(0);
    });

    it('should convert plain error objects to ValidationError instances', () => {
      const plainError = {
        field: 'email',
        message: 'Invalid email format',
        severity: ValidationSeverity.ERROR,
      };

      const dto = new BaseValidationDto({
        isValid: false,
        errors: [plainError],
      });

      expect(dto.errors[0]).toBeInstanceOf(ValidationError);
      expect(dto.errors[0].field).toBe('email');
    });
  });

  describe('Validation', () => {
    it('should validate a valid dto', async () => {
      const dto = new BaseValidationDto({
        isValid: true,
        errors: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when isValid is missing', async () => {
      const dto = new BaseValidationDto({} as any);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('should fail validation when errors is not an array', async () => {
      const dto = new BaseValidationDto({
        isValid: true,
        errors: 'not an array' as any,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });

    it('should allow optional context', async () => {
      const dto = new BaseValidationDto({
        isValid: true,
        errors: [],
        context: 'test context',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when context is not a string', async () => {
      const dto = new BaseValidationDto({
        isValid: true,
        errors: [],
        context: 123 as any,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
    });
  });

  describe('ValidationError', () => {
    it('should create a valid validation error', () => {
      const error = new ValidationError({
        field: 'password',
        message: 'Password too weak',
        severity: ValidationSeverity.WARNING,
        code: 'WEAK_PASSWORD',
      });

      expect(error.field).toBe('password');
      expect(error.message).toBe('Password too weak');
      expect(error.severity).toBe(ValidationSeverity.WARNING);
      expect(error.code).toBe('WEAK_PASSWORD');
    });

    it('should validate a valid error object', async () => {
      const error = new ValidationError({
        field: 'email',
        message: 'Invalid email',
        severity: ValidationSeverity.ERROR,
      });

      const errors = await validate(error);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when required fields are missing', async () => {
      const error = new ValidationError({} as any);
      const errors = await validate(error);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when severity is invalid', async () => {
      const error = new ValidationError({
        field: 'test',
        message: 'test',
        severity: 'INVALID' as any,
      });

      const errors = await validate(error);
      expect(errors).toHaveLength(1);
    });
  });

  describe('Performance', () => {
    it('should instantiate quickly with many errors', () => {
      const start = process.hrtime();
      
      const errors = Array(1000).fill(null).map(() => ({
        field: 'test',
        message: 'test message',
        severity: ValidationSeverity.INFO,
      }));

      const dto = new BaseValidationDto({
        isValid: false,
        errors,
      });

      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      expect(milliseconds).toBeLessThan(100);
      expect(dto.errors).toHaveLength(1000);
      expect(dto.errors[0]).toBeInstanceOf(ValidationError);
    });
  });

  describe('Serialization', () => {
    it('should correctly serialize and deserialize', () => {
      const original = new BaseValidationDto({
        isValid: false,
        errors: [
          new ValidationError({
            field: 'test',
            message: 'test message',
            severity: ValidationSeverity.ERROR,
            code: 'TEST_ERROR',
          }),
        ],
        context: 'test context',
      });

      const serialized = JSON.stringify(original);
      const deserialized = new BaseValidationDto(JSON.parse(serialized));

      expect(deserialized).toBeInstanceOf(BaseValidationDto);
      expect(deserialized.errors[0]).toBeInstanceOf(ValidationError);
      expect(deserialized).toEqual(original);
    });
  });
});
