import { validate } from 'class-validator';
import { IsStringRecord } from '../is-string-record.validator';

class TestDto {
  @IsStringRecord()
  stringRecord!: Record<string, string>;
}

describe('IsStringRecord', () => {
  it('should pass validation when all values are strings', async () => {
    const dto = new TestDto();
    dto.stringRecord = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when any value is not a string', async () => {
    const dto = new TestDto();
    const record: Record<string, unknown> = {
      key1: 'value1',
      key2: 42,
      key3: 'value3',
    };
    (dto.stringRecord as Record<string, unknown>) = record;

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('stringRecord');
    expect(errors[0].constraints?.isStringRecord).toBe('stringRecord must be an object with string values');
  });

  it('should fail validation when value is null', async () => {
    const dto = new TestDto();
    (dto.stringRecord as unknown) = null;

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('stringRecord');
    expect(errors[0].constraints?.isStringRecord).toBe('stringRecord must be an object with string values');
  });

  it('should fail validation when value is not an object', async () => {
    const dto = new TestDto();
    (dto.stringRecord as unknown) = 'not an object';

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('stringRecord');
    expect(errors[0].constraints?.isStringRecord).toBe('stringRecord must be an object with string values');
  });

  it('should fail validation when value is undefined', async () => {
    const dto = new TestDto();
    (dto.stringRecord as unknown) = undefined;

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('stringRecord');
    expect(errors[0].constraints?.isStringRecord).toBe('stringRecord must be an object with string values');
  });

  it('should fail validation when value is an array', async () => {
    const dto = new TestDto();
    (dto.stringRecord as unknown) = ['value1', 'value2'];

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('stringRecord');
    expect(errors[0].constraints?.isStringRecord).toBe('stringRecord must be an object with string values');
  });

  it('should pass validation with empty object', async () => {
    const dto = new TestDto();
    dto.stringRecord = {};

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when object has nested objects', async () => {
    const dto = new TestDto();
    const record: Record<string, unknown> = {
      key1: 'value1',
      key2: { nested: 'value' },
    };
    (dto.stringRecord as Record<string, unknown>) = record;

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('stringRecord');
    expect(errors[0].constraints?.isStringRecord).toBe('stringRecord must be an object with string values');
  });
});
