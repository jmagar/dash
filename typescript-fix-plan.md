# TypeScript Fix Plan

## src/shared/dtos/base/

### src\shared\dtos\base\base-audit.dto.ts

- Line 21: Using any type
```typescript
// Original:
  oldValue?: any;

// Suggested Fix:
// TODO: Replace 'any' with specific type
  oldValue?: any;
```

- Line 25: Using any type
```typescript
// Original:
  newValue?: any;

// Suggested Fix:
// TODO: Replace 'any' with specific type
  newValue?: any;
```

### src\shared\dtos\base\base-config.dto.ts

- Line 8: Using any type
```typescript
// Original:
  value: any;

// Suggested Fix:
// TODO: Replace 'any' with specific type
  value: any;
```

### src\shared\dtos\base\base-error.dto.ts

- Line 144: Missing type annotation
```typescript
// Original:
        const date = new Date(this.timestamp);

// Suggested Fix:
// TODO: Add type annotation
        const date = new Date(this.timestamp);
```

### src\shared\dtos\base\base-response.dto.ts

- Line 39: Missing type annotation
```typescript
// Original:
    const date = new Date(value);

// Suggested Fix:
// TODO: Add type annotation
    const date = new Date(value);
```

- Line 64: Using any type
```typescript
// Original:
  static error<T>(message: string, error?: any): BaseResponseDto<T> {

// Suggested Fix:
// TODO: Replace 'any' with specific type
  static error<T>(message: string, error?: any): BaseResponseDto<T> {
```

### src\shared\dtos\base\validators\is-start-date-before-end-date.validator.ts

- Line 8: Missing type annotation
```typescript
// Original:
    const object = args.object as any;

// Suggested Fix:
// TODO: Add type annotation
    const object = args.object as any;
```

- Line 8: Using any type
```typescript
// Original:
    const object = args.object as any;

// Suggested Fix:
// TODO: Replace 'any' with specific type
    const object = args.object as any;
```

- Line 9: Missing type annotation
```typescript
// Original:
    const endDate = object.endDate;

// Suggested Fix:
// TODO: Add type annotation
    const endDate = object.endDate;
```

### src\shared\dtos\base\validators\is-string-record.validator.ts

- Line 11: Using any type
```typescript
// Original:
        validate(value: any, args: ValidationArguments) {

// Suggested Fix:
// TODO: Replace 'any' with specific type
        validate(value: any, args: ValidationArguments) {
```

### src\shared\dtos\base\__tests__\base-audit.dto.spec.ts

- Line 8: Missing type annotation
```typescript
// Original:
      const dto = new BaseAuditDto({});

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseAuditDto({});
```

- Line 9: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 19: Missing type annotation
```typescript
// Original:
      const validDto = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const validDto = new BaseAuditDto({
```

- Line 26: Missing type annotation
```typescript
// Original:
      const validErrors = await validate(validDto);

// Suggested Fix:
// TODO: Add type annotation
      const validErrors = await validate(validDto);
```

- Line 29: Missing type annotation
```typescript
// Original:
      const invalidDto = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const invalidDto = new BaseAuditDto({
```

- Line 36: Missing type annotation
```typescript
// Original:
      const invalidErrors = await validate(invalidDto);

// Suggested Fix:
// TODO: Add type annotation
      const invalidErrors = await validate(invalidDto);
```

- Line 42: Missing type annotation
```typescript
// Original:
      const dto = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseAuditDto({
```

- Line 53: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 60: Missing type annotation
```typescript
// Original:
      const before = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const before = new Date();
```

- Line 61: Missing type annotation
```typescript
// Original:
      const dto = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseAuditDto({
```

- Line 68: Missing type annotation
```typescript
// Original:
      const after = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const after = new Date();
```

- Line 78: Missing type annotation
```typescript
// Original:
      const dto = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseAuditDto({
```

- Line 87: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 92: Missing type annotation
```typescript
// Original:
      const dto = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseAuditDto({
```

- Line 98: Using any type
```typescript
// Original:
        metadata: 'invalid' as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        metadata: 'invalid' as any
```

- Line 100: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 108: Missing type annotation
```typescript
// Original:
      const dto = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseAuditDto({
```

- Line 116: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 119: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 125: Missing type annotation
```typescript
// Original:
      const dto = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseAuditDto({
```

- Line 137: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 144: Missing type annotation
```typescript
// Original:
      const original = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseAuditDto({
```

- Line 156: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 157: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseAuditDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseAuditDto, JSON.parse(serialized));
```

- Line 167: Missing type annotation
```typescript
// Original:
      const original = new BaseAuditDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseAuditDto({
```

- Line 175: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 176: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseAuditDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseAuditDto, JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-config.dto.spec.ts

- Line 8: Missing type annotation
```typescript
// Original:
      const dto = new BaseConfigDto({});

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseConfigDto({});
```

- Line 9: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 18: Missing type annotation
```typescript
// Original:
      const dto = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseConfigDto({
```

- Line 28: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 33: Missing type annotation
```typescript
// Original:
      const dto = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseConfigDto({
```

- Line 39: Using any type
```typescript
// Original:
          type: 123 as any, // invalid type - should be string

// Suggested Fix:
// TODO: Replace 'any' with specific type
          type: 123 as any, // invalid type - should be string
```

- Line 40: Using any type
```typescript
// Original:
          isEncrypted: 'false' as any // invalid type - should be boolean

// Suggested Fix:
// TODO: Replace 'any' with specific type
          isEncrypted: 'false' as any // invalid type - should be boolean
```

- Line 43: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 45: Missing type annotation
```typescript
// Original:
      const valueErrors = errors.find(e => e.property === 'value')?.children || [];

// Suggested Fix:
// TODO: Add type annotation
      const valueErrors = errors.find(e => e.property === 'value')?.children || [];
```

- Line 53: Missing type annotation
```typescript
// Original:
      const dto = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseConfigDto({
```

- Line 68: Missing type annotation
```typescript
// Original:
      const before = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const before = new Date();
```

- Line 70: Missing type annotation
```typescript
// Original:
      const after = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const after = new Date();
```

- Line 72: Missing type annotation
```typescript
// Original:
      const updatedAt = new Date(configValue.updatedAt);

// Suggested Fix:
// TODO: Add type annotation
      const updatedAt = new Date(configValue.updatedAt);
```

- Line 80: Missing type annotation
```typescript
// Original:
      const dto = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseConfigDto({
```

- Line 88: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 93: Missing type annotation
```typescript
// Original:
      const dto = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseConfigDto({
```

- Line 98: Using any type
```typescript
// Original:
        tags: { valid: 'string', invalid: 123 as any }

// Suggested Fix:
// TODO: Replace 'any' with specific type
        tags: { valid: 'string', invalid: 123 as any }
```

- Line 100: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 108: Missing type annotation
```typescript
// Original:
      const dto = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseConfigDto({
```

- Line 118: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 121: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 127: Missing type annotation
```typescript
// Original:
      const dto = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseConfigDto({
```

- Line 139: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 146: Missing type annotation
```typescript
// Original:
      const original = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseConfigDto({
```

- Line 158: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 159: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseConfigDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseConfigDto, JSON.parse(serialized));
```

- Line 170: Missing type annotation
```typescript
// Original:
      const original = new BaseConfigDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseConfigDto({
```

- Line 180: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 181: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseConfigDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseConfigDto, JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-entity.dto.spec.ts

- Line 5: Missing type annotation
```typescript
// Original:
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

// Suggested Fix:
// TODO: Add type annotation
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
```

- Line 6: Missing type annotation
```typescript
// Original:
  const validAudit = {

// Suggested Fix:
// TODO: Add type annotation
  const validAudit = {
```

- Line 15: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 20: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 22: Missing type annotation
```typescript
// Original:
      const idError = errors.find(e => e.property === 'id');

// Suggested Fix:
// TODO: Add type annotation
      const idError = errors.find(e => e.property === 'id');
```

- Line 28: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 33: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 35: Missing type annotation
```typescript
// Original:
      const tenantError = errors.find(e => e.property === 'tenantId');

// Suggested Fix:
// TODO: Add type annotation
      const tenantError = errors.find(e => e.property === 'tenantId');
```

- Line 41: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 47: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 52: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 58: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 60: Missing type annotation
```typescript
// Original:
      const versionError = errors.find(e => e.property === 'version');

// Suggested Fix:
// TODO: Add type annotation
      const versionError = errors.find(e => e.property === 'version');
```

- Line 66: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 72: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 74: Missing type annotation
```typescript
// Original:
      const tagsError = errors.find(e => e.property === 'tags');

// Suggested Fix:
// TODO: Add type annotation
      const tagsError = errors.find(e => e.property === 'tags');
```

- Line 82: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 90: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 92: Missing type annotation
```typescript
// Original:
      const auditError = errors.find(e => e.property === 'audit');

// Suggested Fix:
// TODO: Add type annotation
      const auditError = errors.find(e => e.property === 'audit');
```

- Line 98: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 106: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 108: Missing type annotation
```typescript
// Original:
      const auditError = errors.find(e => e.property === 'audit');

// Suggested Fix:
// TODO: Add type annotation
      const auditError = errors.find(e => e.property === 'audit');
```

- Line 116: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 125: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 136: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 142: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 145: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 151: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 159: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 166: Missing type annotation
```typescript
// Original:
      const original = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseEntityDto({
```

- Line 183: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 184: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseEntityDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseEntityDto(JSON.parse(serialized));
```

- Line 198: Missing type annotation
```typescript
// Original:
      const original = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseEntityDto({
```

- Line 204: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 205: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseEntityDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseEntityDto(JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-error.dto.spec.ts

- Line 5: Missing type annotation
```typescript
// Original:
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

// Suggested Fix:
// TODO: Add type annotation
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
```

- Line 6: Missing type annotation
```typescript
// Original:
  const validErrorDto = {

// Suggested Fix:
// TODO: Add type annotation
  const validErrorDto = {
```

- Line 15: Missing type annotation
```typescript
// Original:
      const invalidCodes = ['lowercase', 'With Space', '123_START_NUMBER', 'TOO_LONG'.repeat(10)];

// Suggested Fix:
// TODO: Add type annotation
      const invalidCodes = ['lowercase', 'With Space', '123_START_NUMBER', 'TOO_LONG'.repeat(10)];
```

- Line 18: Missing type annotation
```typescript
// Original:
        const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
        const dto = new BaseErrorDto({
```

- Line 22: Missing type annotation
```typescript
// Original:
        const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
        const errors = await validate(dto);
```

- Line 24: Missing type annotation
```typescript
// Original:
        const codeError = errors.find(e => e.property === 'code');

// Suggested Fix:
// TODO: Add type annotation
        const codeError = errors.find(e => e.property === 'code');
```

- Line 29: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 33: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 38: Missing type annotation
```typescript
// Original:
      const invalidCategories = ['lowercase', 'With Space', '123Category', 'TooLong'.repeat(10)];

// Suggested Fix:
// TODO: Add type annotation
      const invalidCategories = ['lowercase', 'With Space', '123Category', 'TooLong'.repeat(10)];
```

- Line 41: Missing type annotation
```typescript
// Original:
        const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
        const dto = new BaseErrorDto({
```

- Line 45: Missing type annotation
```typescript
// Original:
        const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
        const errors = await validate(dto);
```

- Line 47: Missing type annotation
```typescript
// Original:
        const categoryError = errors.find(e => e.property === 'category');

// Suggested Fix:
// TODO: Add type annotation
        const categoryError = errors.find(e => e.property === 'category');
```

- Line 52: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 56: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 61: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 65: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 67: Missing type annotation
```typescript
// Original:
      const messageError = errors.find(e => e.property === 'message');

// Suggested Fix:
// TODO: Add type annotation
      const messageError = errors.find(e => e.property === 'message');
```

- Line 70: Missing type annotation
```typescript
// Original:
      const longDto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const longDto = new BaseErrorDto({
```

- Line 74: Missing type annotation
```typescript
// Original:
      const longErrors = await validate(longDto);

// Suggested Fix:
// TODO: Add type annotation
      const longErrors = await validate(longDto);
```

- Line 76: Missing type annotation
```typescript
// Original:
      const longMessageError = longErrors.find(e => e.property === 'message');

// Suggested Fix:
// TODO: Add type annotation
      const longMessageError = longErrors.find(e => e.property === 'message');
```

- Line 81: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 86: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 95: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 107: Missing type annotation
```typescript
// Original:
      const locationErrors = errors.find(e => e.property === 'location');

// Suggested Fix:
// TODO: Add type annotation
      const locationErrors = errors.find(e => e.property === 'location');
```

- Line 112: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 123: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 130: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 139: Missing type annotation
```typescript
// Original:
      const before = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const before = new Date();
```

- Line 140: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 145: Missing type annotation
```typescript
// Original:
      const after = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const after = new Date();
```

- Line 147: Missing type annotation
```typescript
// Original:
      const timestamp = new Date(dto.timestamp);

// Suggested Fix:
// TODO: Add type annotation
      const timestamp = new Date(dto.timestamp);
```

- Line 155: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 167: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 170: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 176: Missing type annotation
```typescript
// Original:
      const dto = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseErrorDto({
```

- Line 196: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 203: Missing type annotation
```typescript
// Original:
      const original = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseErrorDto({
```

- Line 228: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 229: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseErrorDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseErrorDto(JSON.parse(serialized));
```

- Line 246: Missing type annotation
```typescript
// Original:
      const original = new BaseErrorDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseErrorDto({
```

- Line 252: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 253: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseErrorDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseErrorDto(JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-health.dto.spec.ts

- Line 8: Missing type annotation
```typescript
// Original:
      const dto = new BaseHealthDto({});

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseHealthDto({});
```

- Line 9: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 18: Missing type annotation
```typescript
// Original:
      const dto = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseHealthDto({
```

- Line 28: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 33: Missing type annotation
```typescript
// Original:
      const dto = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseHealthDto({
```

- Line 38: Using any type
```typescript
// Original:
          memoryUsage: 'invalid' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
          memoryUsage: 'invalid' as any,
```

- Line 39: Using any type
```typescript
// Original:
          cpuUsage: '25.5' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
          cpuUsage: '25.5' as any,
```

- Line 40: Using any type
```typescript
// Original:
          diskUsage: true as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
          diskUsage: true as any
```

- Line 43: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 45: Missing type annotation
```typescript
// Original:
      const metricsErrors = errors.find(e => e.property === 'metrics')?.children || [];

// Suggested Fix:
// TODO: Add type annotation
      const metricsErrors = errors.find(e => e.property === 'metrics')?.children || [];
```

- Line 54: Missing type annotation
```typescript
// Original:
      const before = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const before = new Date();
```

- Line 55: Missing type annotation
```typescript
// Original:
      const dto = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseHealthDto({
```

- Line 65: Missing type annotation
```typescript
// Original:
      const after = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const after = new Date();
```

- Line 67: Missing type annotation
```typescript
// Original:
      const timestamp = new Date(dto.timestamp);

// Suggested Fix:
// TODO: Add type annotation
      const timestamp = new Date(dto.timestamp);
```

- Line 76: Missing type annotation
```typescript
// Original:
      const dto = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseHealthDto({
```

- Line 90: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 95: Missing type annotation
```typescript
// Original:
      const dto = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseHealthDto({
```

- Line 104: Using any type
```typescript
// Original:
        details: 'invalid' as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        details: 'invalid' as any
```

- Line 106: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 114: Missing type annotation
```typescript
// Original:
      const dto = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseHealthDto({
```

- Line 125: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 128: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 134: Missing type annotation
```typescript
// Original:
      const dto = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseHealthDto({
```

- Line 149: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 156: Missing type annotation
```typescript
// Original:
      const original = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseHealthDto({
```

- Line 168: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 169: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseHealthDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseHealthDto, JSON.parse(serialized));
```

- Line 181: Missing type annotation
```typescript
// Original:
      const original = new BaseHealthDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseHealthDto({
```

- Line 192: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 193: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseHealthDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseHealthDto, JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-metrics.dto.spec.ts

- Line 8: Missing type annotation
```typescript
// Original:
      const dto = new BaseMetricsDto({});

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseMetricsDto({});
```

- Line 9: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 17: Missing type annotation
```typescript
// Original:
      const dto = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseMetricsDto({
```

- Line 25: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 30: Missing type annotation
```typescript
// Original:
      const dto = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseMetricsDto({
```

- Line 38: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 40: Missing type annotation
```typescript
// Original:
      const valueErrors = errors.find(e => e.property === 'value')?.children || [];

// Suggested Fix:
// TODO: Add type annotation
      const valueErrors = errors.find(e => e.property === 'value')?.children || [];
```

- Line 45: Missing type annotation
```typescript
// Original:
      const dto = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseMetricsDto({
```

- Line 54: Using any type
```typescript
// Original:
            value: 'invalid' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
            value: 'invalid' as any,
```

- Line 63: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 65: Missing type annotation
```typescript
// Original:
      const historyErrors = errors.find(e => e.property === 'history')?.children || [];

// Suggested Fix:
// TODO: Add type annotation
      const historyErrors = errors.find(e => e.property === 'history')?.children || [];
```

- Line 72: Missing type annotation
```typescript
// Original:
      const before = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const before = new Date();
```

- Line 73: Missing type annotation
```typescript
// Original:
      const metricValue = new MetricValue({

// Suggested Fix:
// TODO: Add type annotation
      const metricValue = new MetricValue({
```

- Line 77: Missing type annotation
```typescript
// Original:
      const after = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const after = new Date();
```

- Line 79: Missing type annotation
```typescript
// Original:
      const timestamp = new Date(metricValue.timestamp);

// Suggested Fix:
// TODO: Add type annotation
      const timestamp = new Date(metricValue.timestamp);
```

- Line 88: Missing type annotation
```typescript
// Original:
      const dto = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseMetricsDto({
```

- Line 106: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 111: Missing type annotation
```typescript
// Original:
      const dto = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseMetricsDto({
```

- Line 118: Using any type
```typescript
// Original:
        labels: { valid: 'string', invalid: 123 as any }

// Suggested Fix:
// TODO: Replace 'any' with specific type
        labels: { valid: 'string', invalid: 123 as any }
```

- Line 120: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 128: Missing type annotation
```typescript
// Original:
      const dto = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseMetricsDto({
```

- Line 137: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 140: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 146: Missing type annotation
```typescript
// Original:
      const dto = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseMetricsDto({
```

- Line 165: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 172: Missing type annotation
```typescript
// Original:
      const original = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseMetricsDto({
```

- Line 190: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 191: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseMetricsDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseMetricsDto, JSON.parse(serialized));
```

- Line 203: Missing type annotation
```typescript
// Original:
      const original = new BaseMetricsDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseMetricsDto({
```

- Line 212: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 213: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseMetricsDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseMetricsDto, JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-notification.dto.spec.ts

- Line 8: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({} as any);

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({} as any);
```

- Line 8: Using any type
```typescript
// Original:
      const dto = new BaseNotificationDto({} as any);

// Suggested Fix:
// TODO: Replace 'any' with specific type
      const dto = new BaseNotificationDto({} as any);
```

- Line 9: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 12: Missing type annotation
```typescript
// Original:
      const constraints = errors.reduce((acc, err) => ({

// Suggested Fix:
// TODO: Add type annotation
      const constraints = errors.reduce((acc, err) => ({
```

- Line 25: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 26: Using any type
```typescript
// Original:
        type: 'INVALID' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
        type: 'INVALID' as any,
```

- Line 32: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 39: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 41: Using any type
```typescript
// Original:
        priority: 'INVALID' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
        priority: 'INVALID' as any,
```

- Line 46: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 53: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 58: Using any type
```typescript
// Original:
        recipients: [123] as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        recipients: [123] as any
```

- Line 60: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 68: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 80: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 89: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 97: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 110: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 113: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 119: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 137: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 144: Missing type annotation
```typescript
// Original:
      const createdAt = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const createdAt = new Date();
```

- Line 145: Missing type annotation
```typescript
// Original:
      const expiresAt = new Date(createdAt.getTime() + 86400000); // +1 day

// Suggested Fix:
// TODO: Add type annotation
      const expiresAt = new Date(createdAt.getTime() + 86400000); // +1 day
```

- Line 147: Missing type annotation
```typescript
// Original:
      const original = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseNotificationDto({
```

- Line 161: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 162: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseNotificationDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseNotificationDto(JSON.parse(serialized));
```

- Line 175: Missing type annotation
```typescript
// Original:
      const original = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseNotificationDto({
```

- Line 183: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 184: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseNotificationDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseNotificationDto(JSON.parse(serialized));
```

- Line 194: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 206: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 215: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 224: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseNotificationDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseNotificationDto, {
```

- Line 239: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 244: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseNotificationDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseNotificationDto, {
```

- Line 254: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 263: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 269: Using any type
```typescript
// Original:
        metadata: 'invalid' as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        metadata: 'invalid' as any
```

- Line 272: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 278: Missing type annotation
```typescript
// Original:
      const dto = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseNotificationDto({
```

- Line 291: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

### src\shared\dtos\base\__tests__\base-permission.dto.spec.ts

- Line 7: Missing type annotation
```typescript
// Original:
      const dto = new BasePermissionDto({});

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BasePermissionDto({});
```

- Line 8: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 16: Missing type annotation
```typescript
// Original:
      const dto = new BasePermissionDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BasePermissionDto({
```

- Line 21: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 26: Missing type annotation
```typescript
// Original:
      const dto = new BasePermissionDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BasePermissionDto({
```

- Line 31: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 38: Missing type annotation
```typescript
// Original:
      const now = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const now = new Date();
```

- Line 39: Missing type annotation
```typescript
// Original:
      const dto = new BasePermissionDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BasePermissionDto({
```

- Line 49: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 59: Missing type annotation
```typescript
// Original:
      const dto = new BasePermissionDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BasePermissionDto({
```

- Line 64: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 73: Missing type annotation
```typescript
// Original:
      const dto = new BasePermissionDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BasePermissionDto({
```

- Line 78: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 81: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 86: Missing type annotation
```typescript
// Original:
      const dto = new BasePermissionDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BasePermissionDto({
```

- Line 95: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 102: Missing type annotation
```typescript
// Original:
      const original = new BasePermissionDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BasePermissionDto({
```

- Line 111: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 112: Missing type annotation
```typescript
// Original:
      const deserialized = new BasePermissionDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BasePermissionDto(JSON.parse(serialized));
```

- Line 120: Missing type annotation
```typescript
// Original:
      const original = new BasePermissionDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BasePermissionDto({
```

- Line 125: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 126: Missing type annotation
```typescript
// Original:
      const deserialized = new BasePermissionDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BasePermissionDto(JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-request.dto.spec.ts

- Line 8: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({});

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({});
```

- Line 13: Missing type annotation
```typescript
// Original:
      const userContext = {

// Suggested Fix:
// TODO: Add type annotation
      const userContext = {
```

- Line 20: Missing type annotation
```typescript
// Original:
      const tenantContext = {

// Suggested Fix:
// TODO: Add type annotation
      const tenantContext = {
```

- Line 26: Missing type annotation
```typescript
// Original:
      const settings = {

// Suggested Fix:
// TODO: Add type annotation
      const settings = {
```

- Line 33: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({
```

- Line 53: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({});

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({});
```

- Line 54: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 59: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({
```

- Line 62: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 67: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({
```

- Line 72: Using any type
```typescript
// Original:
        } as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        } as any
```

- Line 79: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({
```

- Line 83: Using any type
```typescript
// Original:
        } as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        } as any
```

- Line 90: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({
```

- Line 96: Using any type
```typescript
// Original:
        } as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        } as any
```

- Line 105: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({
```

- Line 108: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 113: Missing type annotation
```typescript
// Original:
      const dto = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseRequestDto({
```

- Line 116: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 125: Missing type annotation
```typescript
// Original:
      const context = new UserContext();

// Suggested Fix:
// TODO: Add type annotation
      const context = new UserContext();
```

- Line 133: Missing type annotation
```typescript
// Original:
      const errors = await validate(context);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(context);
```

- Line 138: Missing type annotation
```typescript
// Original:
      const context = new UserContext();

// Suggested Fix:
// TODO: Add type annotation
      const context = new UserContext();
```

- Line 139: Missing type annotation
```typescript
// Original:
      const errors = await validate(context);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(context);
```

- Line 146: Missing type annotation
```typescript
// Original:
      const context = new TenantContext();

// Suggested Fix:
// TODO: Add type annotation
      const context = new TenantContext();
```

- Line 153: Missing type annotation
```typescript
// Original:
      const errors = await validate(context);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(context);
```

- Line 158: Missing type annotation
```typescript
// Original:
      const context = new TenantContext();

// Suggested Fix:
// TODO: Add type annotation
      const context = new TenantContext();
```

- Line 159: Missing type annotation
```typescript
// Original:
      const errors = await validate(context);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(context);
```

- Line 166: Missing type annotation
```typescript
// Original:
      const settings = new RequestSettings();

// Suggested Fix:
// TODO: Add type annotation
      const settings = new RequestSettings();
```

- Line 174: Missing type annotation
```typescript
// Original:
      const errors = await validate(settings);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(settings);
```

- Line 179: Missing type annotation
```typescript
// Original:
      const settings = new RequestSettings();

// Suggested Fix:
// TODO: Add type annotation
      const settings = new RequestSettings();
```

- Line 189: Missing type annotation
```typescript
// Original:
      const plainData = {

// Suggested Fix:
// TODO: Add type annotation
      const plainData = {
```

- Line 206: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseRequestDto, plainData);

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseRequestDto, plainData);
```

- Line 213: Missing type annotation
```typescript
// Original:
      const plainData = {

// Suggested Fix:
// TODO: Add type annotation
      const plainData = {
```

- Line 218: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseRequestDto, plainData);

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseRequestDto, plainData);
```

- Line 227: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 229: Missing type annotation
```typescript
// Original:
      const createComplexDto = () => new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const createComplexDto = () => new BaseRequestDto({
```

- Line 258: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 266: Missing type annotation
```typescript
// Original:
      const original = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseRequestDto({
```

- Line 279: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 280: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseRequestDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseRequestDto(JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-response.dto.spec.ts

- Line 8: Missing type annotation
```typescript
// Original:
      const dto = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseResponseDto({
```

- Line 13: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 19: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseResponseDto, {
```

- Line 24: Missing type annotation
```typescript
// Original:
      const dto2 = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto2 = plainToInstance(BaseResponseDto, {
```

- Line 31: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseResponseDto, {
```

- Line 52: Missing type annotation
```typescript
// Original:
      const dto = new BaseResponseDto<TestData>({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseResponseDto<TestData>({
```

- Line 56: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 62: Missing type annotation
```typescript
// Original:
      const error = {

// Suggested Fix:
// TODO: Add type annotation
      const error = {
```

- Line 67: Missing type annotation
```typescript
// Original:
      const dto = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseResponseDto({
```

- Line 73: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 82: Missing type annotation
```typescript
// Original:
      const response = BaseResponseDto.success(data, 'Operation successful');

// Suggested Fix:
// TODO: Add type annotation
      const response = BaseResponseDto.success(data, 'Operation successful');
```

- Line 93: Missing type annotation
```typescript
// Original:
      const response = BaseResponseDto.error('Operation failed', error);

// Suggested Fix:
// TODO: Add type annotation
      const response = BaseResponseDto.error('Operation failed', error);
```

- Line 105: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseResponseDto, {
```

- Line 114: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseResponseDto, {
```

- Line 122: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseResponseDto, {
```

- Line 131: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseResponseDto, {
```

- Line 137: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 140: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 146: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseResponseDto, {
```

- Line 152: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 159: Missing type annotation
```typescript
// Original:
      const original = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const original = plainToInstance(BaseResponseDto, {
```

- Line 166: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 167: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
```

- Line 177: Missing type annotation
```typescript
// Original:
      const dto = plainToInstance(BaseResponseDto, {

// Suggested Fix:
// TODO: Add type annotation
      const dto = plainToInstance(BaseResponseDto, {
```

### src\shared\dtos\base\__tests__\base-search.dto.spec.ts

- Line 8: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 9: Using any type
```typescript
// Original:
        page: 'invalid' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
        page: 'invalid' as any,
```

- Line 19: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 21: Using any type
```typescript
// Original:
        limit: 'invalid' as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        limit: 'invalid' as any
```

- Line 30: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 33: Using any type
```typescript
// Original:
        sort: [{ field: 'name', direction: 'INVALID' as any }]

// Suggested Fix:
// TODO: Replace 'any' with specific type
        sort: [{ field: 'name', direction: 'INVALID' as any }]
```

- Line 41: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 51: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 62: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 73: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 84: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({});

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({});
```

- Line 90: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 91: Using any type
```typescript
// Original:
        page: '2' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
        page: '2' as any,
```

- Line 92: Using any type
```typescript
// Original:
        limit: '20' as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        limit: '20' as any
```

- Line 103: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 106: Using any type
```typescript
// Original:
          direction: 'INVALID' as any 

// Suggested Fix:
// TODO: Replace 'any' with specific type
          direction: 'INVALID' as any 
```

- Line 115: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 128: Missing type annotation
```typescript
// Original:
      const plainData = {

// Suggested Fix:
// TODO: Add type annotation
      const plainData = {
```

- Line 142: Missing type annotation
```typescript
// Original:
      const plainData = {

// Suggested Fix:
// TODO: Add type annotation
      const plainData = {
```

- Line 160: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 175: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 178: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 184: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 205: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 212: Missing type annotation
```typescript
// Original:
      const original = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseSearchDto({
```

- Line 224: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 225: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseSearchDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseSearchDto(JSON.parse(serialized));
```

- Line 237: Missing type annotation
```typescript
// Original:
      const original = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseSearchDto({
```

- Line 242: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 243: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseSearchDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseSearchDto(JSON.parse(serialized));
```

- Line 254: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

- Line 265: Missing type annotation
```typescript
// Original:
      const dto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseSearchDto({
```

### src\shared\dtos\base\__tests__\base-time-range.dto.spec.ts

- Line 7: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 8: Using any type
```typescript
// Original:
        startDate: 'invalid-date' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
        startDate: 'invalid-date' as any,
```

- Line 11: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 13: Missing type annotation
```typescript
// Original:
      const dateError = errors.find(e => e.property === 'startDate');

// Suggested Fix:
// TODO: Add type annotation
      const dateError = errors.find(e => e.property === 'startDate');
```

- Line 19: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 21: Using any type
```typescript
// Original:
        endDate: 'invalid-date' as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        endDate: 'invalid-date' as any
```

- Line 23: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 25: Missing type annotation
```typescript
// Original:
      const dateError = errors.find(e => e.property === 'endDate');

// Suggested Fix:
// TODO: Add type annotation
      const dateError = errors.find(e => e.property === 'endDate');
```

- Line 31: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 36: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 41: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 46: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 48: Missing type annotation
```typescript
// Original:
      const timezoneError = errors.find(e => e.property === 'timezone');

// Suggested Fix:
// TODO: Add type annotation
      const timezoneError = errors.find(e => e.property === 'timezone');
```

- Line 53: Missing type annotation
```typescript
// Original:
      const validGranularities = Object.values(TimeGranularity);

// Suggested Fix:
// TODO: Add type annotation
      const validGranularities = Object.values(TimeGranularity);
```

- Line 56: Missing type annotation
```typescript
// Original:
        const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
        const dto = new BaseTimeRangeDto({
```

- Line 61: Missing type annotation
```typescript
// Original:
        const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
        const errors = await validate(dto);
```

- Line 67: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 70: Using any type
```typescript
// Original:
        granularity: 'invalid' as any

// Suggested Fix:
// TODO: Replace 'any' with specific type
        granularity: 'invalid' as any
```

- Line 72: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 74: Missing type annotation
```typescript
// Original:
      const granularityError = errors.find(e => e.property === 'granularity');

// Suggested Fix:
// TODO: Add type annotation
      const granularityError = errors.find(e => e.property === 'granularity');
```

- Line 82: Missing type annotation
```typescript
// Original:
      const endDate = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const endDate = new Date();
```

- Line 83: Missing type annotation
```typescript
// Original:
      const startDate = new Date(endDate.getTime() + 1000); // startDate after endDate

// Suggested Fix:
// TODO: Add type annotation
      const startDate = new Date(endDate.getTime() + 1000); // startDate after endDate
```

- Line 85: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 90: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 92: Missing type annotation
```typescript
// Original:
      const dateError = errors.find(e => e.constraints?.isStartDateBeforeEndDate);

// Suggested Fix:
// TODO: Add type annotation
      const dateError = errors.find(e => e.constraints?.isStartDateBeforeEndDate);
```

- Line 97: Missing type annotation
```typescript
// Original:
      const date = new Date();

// Suggested Fix:
// TODO: Add type annotation
      const date = new Date();
```

- Line 98: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 103: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 111: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 118: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 125: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 132: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 135: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 141: Missing type annotation
```typescript
// Original:
      const dto = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseTimeRangeDto({
```

- Line 148: Missing type annotation
```typescript
// Original:
      const size = Buffer.byteLength(JSON.stringify(dto));

// Suggested Fix:
// TODO: Add type annotation
      const size = Buffer.byteLength(JSON.stringify(dto));
```

- Line 155: Missing type annotation
```typescript
// Original:
      const original = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseTimeRangeDto({
```

- Line 162: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 163: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseTimeRangeDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseTimeRangeDto(JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\base-validation.dto.spec.ts

- Line 7: Missing type annotation
```typescript
// Original:
      const validationError = new ValidationError({

// Suggested Fix:
// TODO: Add type annotation
      const validationError = new ValidationError({
```

- Line 13: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({
```

- Line 26: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({
```

- Line 35: Missing type annotation
```typescript
// Original:
      const plainError = {

// Suggested Fix:
// TODO: Add type annotation
      const plainError = {
```

- Line 41: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({
```

- Line 53: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({
```

- Line 58: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 63: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({} as any);

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({} as any);
```

- Line 63: Using any type
```typescript
// Original:
      const dto = new BaseValidationDto({} as any);

// Suggested Fix:
// TODO: Replace 'any' with specific type
      const dto = new BaseValidationDto({} as any);
```

- Line 64: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 69: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({
```

- Line 71: Using any type
```typescript
// Original:
        errors: 'not an array' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
        errors: 'not an array' as any,
```

- Line 74: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 79: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({
```

- Line 85: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 90: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({
```

- Line 93: Using any type
```typescript
// Original:
        context: 123 as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
        context: 123 as any,
```

- Line 96: Missing type annotation
```typescript
// Original:
      const errors = await validate(dto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(dto);
```

- Line 103: Missing type annotation
```typescript
// Original:
      const error = new ValidationError({

// Suggested Fix:
// TODO: Add type annotation
      const error = new ValidationError({
```

- Line 117: Missing type annotation
```typescript
// Original:
      const error = new ValidationError({

// Suggested Fix:
// TODO: Add type annotation
      const error = new ValidationError({
```

- Line 123: Missing type annotation
```typescript
// Original:
      const errors = await validate(error);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(error);
```

- Line 128: Missing type annotation
```typescript
// Original:
      const error = new ValidationError({} as any);

// Suggested Fix:
// TODO: Add type annotation
      const error = new ValidationError({} as any);
```

- Line 128: Using any type
```typescript
// Original:
      const error = new ValidationError({} as any);

// Suggested Fix:
// TODO: Replace 'any' with specific type
      const error = new ValidationError({} as any);
```

- Line 129: Missing type annotation
```typescript
// Original:
      const errors = await validate(error);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(error);
```

- Line 134: Missing type annotation
```typescript
// Original:
      const error = new ValidationError({

// Suggested Fix:
// TODO: Add type annotation
      const error = new ValidationError({
```

- Line 137: Using any type
```typescript
// Original:
        severity: 'INVALID' as any,

// Suggested Fix:
// TODO: Replace 'any' with specific type
        severity: 'INVALID' as any,
```

- Line 140: Missing type annotation
```typescript
// Original:
      const errors = await validate(error);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(error);
```

- Line 147: Missing type annotation
```typescript
// Original:
      const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
      const start = process.hrtime();
```

- Line 149: Missing type annotation
```typescript
// Original:
      const errors = Array(1000).fill(null).map(() => ({

// Suggested Fix:
// TODO: Add type annotation
      const errors = Array(1000).fill(null).map(() => ({
```

- Line 155: Missing type annotation
```typescript
// Original:
      const dto = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseValidationDto({
```

- Line 161: Missing type annotation
```typescript
// Original:
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;

// Suggested Fix:
// TODO: Add type annotation
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
```

- Line 171: Missing type annotation
```typescript
// Original:
      const original = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const original = new BaseValidationDto({
```

- Line 184: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(original);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(original);
```

- Line 185: Missing type annotation
```typescript
// Original:
      const deserialized = new BaseValidationDto(JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = new BaseValidationDto(JSON.parse(serialized));
```

### src\shared\dtos\base\__tests__\dto-edge-cases.spec.ts

- Line 16: Missing type annotation
```typescript
// Original:
      const request = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const request = new BaseRequestDto({
```

- Line 21: Missing type annotation
```typescript
// Original:
      const notification = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const notification = new BaseNotificationDto({
```

- Line 32: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(notification);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(notification);
```

- Line 33: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseNotificationDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseNotificationDto, JSON.parse(serialized));
```

- Line 58: Missing type annotation
```typescript
// Original:
      const deeplyNested = createNestedTimeRange(10); // Test with 10 levels of nesting

// Suggested Fix:
// TODO: Add type annotation
      const deeplyNested = createNestedTimeRange(10); // Test with 10 levels of nesting
```

- Line 59: Missing type annotation
```typescript
// Original:
      const response = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const response = new BaseResponseDto({
```

- Line 65: Missing type annotation
```typescript
// Original:
      const errors = await validate(response);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(response);
```

- Line 69: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(response);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(response);
```

- Line 70: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
```

- Line 78: Missing type annotation
```typescript
// Original:
      const entities = Array(1000).fill(null).map((_, index) => new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const entities = Array(1000).fill(null).map((_, index) => new BaseEntityDto({
```

- Line 93: Missing type annotation
```typescript
// Original:
      const response = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const response = new BaseResponseDto({
```

- Line 99: Missing type annotation
```typescript
// Original:
      const startValidation = Date.now();

// Suggested Fix:
// TODO: Add type annotation
      const startValidation = Date.now();
```

- Line 100: Missing type annotation
```typescript
// Original:
      const errors = await validate(response);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(response);
```

- Line 101: Missing type annotation
```typescript
// Original:
      const validationTime = Date.now() - startValidation;

// Suggested Fix:
// TODO: Add type annotation
      const validationTime = Date.now() - startValidation;
```

- Line 107: Missing type annotation
```typescript
// Original:
      const startSerialization = Date.now();

// Suggested Fix:
// TODO: Add type annotation
      const startSerialization = Date.now();
```

- Line 108: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(response);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(response);
```

- Line 109: Missing type annotation
```typescript
// Original:
      const serializationTime = Date.now() - startSerialization;

// Suggested Fix:
// TODO: Add type annotation
      const serializationTime = Date.now() - startSerialization;
```

- Line 117: Missing type annotation
```typescript
// Original:
      const dtos = Array(10).fill(null).map((_, index) => ({

// Suggested Fix:
// TODO: Add type annotation
      const dtos = Array(10).fill(null).map((_, index) => ({
```

- Line 134: Missing type annotation
```typescript
// Original:
      const startTime = Date.now();

// Suggested Fix:
// TODO: Add type annotation
      const startTime = Date.now();
```

- Line 135: Missing type annotation
```typescript
// Original:
      const validationResults = await Promise.all(

// Suggested Fix:
// TODO: Add type annotation
      const validationResults = await Promise.all(
```

- Line 143: Missing type annotation
```typescript
// Original:
      const totalTime = Date.now() - startTime;

// Suggested Fix:
// TODO: Add type annotation
      const totalTime = Date.now() - startTime;
```

- Line 154: Missing type annotation
```typescript
// Original:
      const searchDto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const searchDto = new BaseSearchDto({
```

- Line 162: Missing type annotation
```typescript
// Original:
      const errors = await validate(searchDto);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(searchDto);
```

- Line 166: Missing type annotation
```typescript
// Original:
      const response = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const response = new BaseResponseDto({
```

- Line 187: Missing type annotation
```typescript
// Original:
      const responseErrors = await validate(response);

// Suggested Fix:
// TODO: Add type annotation
      const responseErrors = await validate(response);
```

- Line 197: Missing type annotation
```typescript
// Original:
      const timeRange = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const timeRange = new BaseTimeRangeDto({
```

- Line 202: Missing type annotation
```typescript
// Original:
      const notification = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const notification = new BaseNotificationDto({
```

- Line 224: Missing type annotation
```typescript
// Original:
      const timeRangeErrors = validateTimeRange(timeRange);

// Suggested Fix:
// TODO: Add type annotation
      const timeRangeErrors = validateTimeRange(timeRange);
```

- Line 225: Missing type annotation
```typescript
// Original:
      const validation = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const validation = new BaseValidationDto({
```

- Line 231: Missing type annotation
```typescript
// Original:
      const response = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const response = new BaseResponseDto({
```

- Line 242: Missing type annotation
```typescript
// Original:
      const responseErrors = await validate(response);

// Suggested Fix:
// TODO: Add type annotation
      const responseErrors = await validate(response);
```

### src\shared\dtos\base\__tests__\dto-integration.spec.ts

- Line 16: Missing type annotation
```typescript
// Original:
      const searchDto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const searchDto = new BaseSearchDto({
```

- Line 25: Missing type annotation
```typescript
// Original:
      const entities = Array(5).fill(null).map((_, index) => new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const entities = Array(5).fill(null).map((_, index) => new BaseEntityDto({
```

- Line 33: Missing type annotation
```typescript
// Original:
      const response = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const response = new BaseResponseDto({
```

- Line 45: Missing type annotation
```typescript
// Original:
      const errors = await validate(response);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(response);
```

- Line 49: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(response);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(response);
```

- Line 50: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
```

- Line 61: Missing type annotation
```typescript
// Original:
      const request = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const request = new BaseRequestDto({
```

- Line 76: Missing type annotation
```typescript
// Original:
      const validation = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const validation = new BaseValidationDto({
```

- Line 88: Missing type annotation
```typescript
// Original:
      const errorResponse = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const errorResponse = new BaseResponseDto({
```

- Line 98: Missing type annotation
```typescript
// Original:
      const errors = await validate(errorResponse);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(errorResponse);
```

- Line 102: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(errorResponse);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(errorResponse);
```

- Line 103: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
```

- Line 114: Missing type annotation
```typescript
// Original:
      const timeRange = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
      const timeRange = new BaseTimeRangeDto({
```

- Line 121: Missing type annotation
```typescript
// Original:
      const notification = new BaseNotificationDto({

// Suggested Fix:
// TODO: Add type annotation
      const notification = new BaseNotificationDto({
```

- Line 134: Missing type annotation
```typescript
// Original:
      const response = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const response = new BaseResponseDto({
```

- Line 141: Missing type annotation
```typescript
// Original:
      const errors = await validate(response);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(response);
```

- Line 145: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(response);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(response);
```

- Line 146: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
```

- Line 157: Missing type annotation
```typescript
// Original:
      const searchRequest = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const searchRequest = new BaseRequestDto({
```

- Line 169: Missing type annotation
```typescript
// Original:
      const searchDto = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
      const searchDto = new BaseSearchDto({
```

- Line 185: Missing type annotation
```typescript
// Original:
      const validation = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const validation = new BaseValidationDto({
```

- Line 191: Missing type annotation
```typescript
// Original:
      const response = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const response = new BaseResponseDto({
```

- Line 208: Missing type annotation
```typescript
// Original:
      const errors = await validate(response);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(response);
```

- Line 212: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(response);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(response);
```

- Line 213: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
```

- Line 225: Missing type annotation
```typescript
// Original:
      const request = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
      const request = new BaseRequestDto({
```

- Line 231: Missing type annotation
```typescript
// Original:
      const validationErrors = [

// Suggested Fix:
// TODO: Add type annotation
      const validationErrors = [
```

- Line 245: Missing type annotation
```typescript
// Original:
      const validation = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
      const validation = new BaseValidationDto({
```

- Line 251: Missing type annotation
```typescript
// Original:
      const errorResponse = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
      const errorResponse = new BaseResponseDto({
```

- Line 263: Missing type annotation
```typescript
// Original:
      const errors = await validate(errorResponse);

// Suggested Fix:
// TODO: Add type annotation
      const errors = await validate(errorResponse);
```

- Line 267: Missing type annotation
```typescript
// Original:
      const serialized = JSON.stringify(errorResponse);

// Suggested Fix:
// TODO: Add type annotation
      const serialized = JSON.stringify(errorResponse);
```

- Line 268: Missing type annotation
```typescript
// Original:
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));

// Suggested Fix:
// TODO: Add type annotation
      const deserialized = plainToInstance(BaseResponseDto, JSON.parse(serialized));
```

- Line 272: Missing type annotation
```typescript
// Original:
      const validationResult = deserialized.error?.details as BaseValidationDto;

// Suggested Fix:
// TODO: Add type annotation
      const validationResult = deserialized.error?.details as BaseValidationDto;
```

### src\shared\dtos\base\__tests__\dto-performance.benchmark.ts

- Line 13: Missing type annotation
```typescript
// Original:
  const start = process.hrtime();

// Suggested Fix:
// TODO: Add type annotation
  const start = process.hrtime();
```

- Line 20: Missing type annotation
```typescript
// Original:
  const ITERATIONS = 1000;

// Suggested Fix:
// TODO: Add type annotation
  const ITERATIONS = 1000;
```

- Line 21: Missing type annotation
```typescript
// Original:
  const MAX_INSTANTIATION_TIME = 1; // ms

// Suggested Fix:
// TODO: Add type annotation
  const MAX_INSTANTIATION_TIME = 1; // ms
```

- Line 22: Missing type annotation
```typescript
// Original:
  const MAX_VALIDATION_TIME = 5; // ms

// Suggested Fix:
// TODO: Add type annotation
  const MAX_VALIDATION_TIME = 5; // ms
```

- Line 23: Missing type annotation
```typescript
// Original:
  const MAX_SERIALIZATION_TIME = 1; // ms

// Suggested Fix:
// TODO: Add type annotation
  const MAX_SERIALIZATION_TIME = 1; // ms
```

- Line 27: Missing type annotation
```typescript
// Original:
      const avgTime = await measureExecutionTime(async () => {

// Suggested Fix:
// TODO: Add type annotation
      const avgTime = await measureExecutionTime(async () => {
```

- Line 28: Missing type annotation
```typescript
// Original:
        for (let i = 0; i < ITERATIONS; i++) {

// Suggested Fix:
// TODO: Add type annotation
        for (let i = 0; i < ITERATIONS; i++) {
```

- Line 42: Missing type annotation
```typescript
// Original:
      const dto = new BaseEntityDto({

// Suggested Fix:
// TODO: Add type annotation
      const dto = new BaseEntityDto({
```

- Line 49: Missing type annotation
```typescript
// Original:
      const avgTime = await measureExecutionTime(async () => {

// Suggested Fix:
// TODO: Add type annotation
      const avgTime = await measureExecutionTime(async () => {
```

- Line 50: Missing type annotation
```typescript
// Original:
        for (let i = 0; i < ITERATIONS; i++) {

// Suggested Fix:
// TODO: Add type annotation
        for (let i = 0; i < ITERATIONS; i++) {
```

- Line 61: Missing type annotation
```typescript
// Original:
      const avgTime = await measureExecutionTime(async () => {

// Suggested Fix:
// TODO: Add type annotation
      const avgTime = await measureExecutionTime(async () => {
```

- Line 62: Missing type annotation
```typescript
// Original:
        for (let i = 0; i < ITERATIONS; i++) {

// Suggested Fix:
// TODO: Add type annotation
        for (let i = 0; i < ITERATIONS; i++) {
```

- Line 63: Missing type annotation
```typescript
// Original:
          const response = new BaseResponseDto({

// Suggested Fix:
// TODO: Add type annotation
          const response = new BaseResponseDto({
```

- Line 79: Missing type annotation
```typescript
// Original:
      const avgTime = await measureExecutionTime(async () => {

// Suggested Fix:
// TODO: Add type annotation
      const avgTime = await measureExecutionTime(async () => {
```

- Line 80: Missing type annotation
```typescript
// Original:
        for (let i = 0; i < ITERATIONS; i++) {

// Suggested Fix:
// TODO: Add type annotation
        for (let i = 0; i < ITERATIONS; i++) {
```

- Line 81: Missing type annotation
```typescript
// Original:
          const timeRange = new BaseTimeRangeDto({

// Suggested Fix:
// TODO: Add type annotation
          const timeRange = new BaseTimeRangeDto({
```

- Line 96: Missing type annotation
```typescript
// Original:
      const avgTime = await measureExecutionTime(async () => {

// Suggested Fix:
// TODO: Add type annotation
      const avgTime = await measureExecutionTime(async () => {
```

- Line 97: Missing type annotation
```typescript
// Original:
        for (let i = 0; i < ITERATIONS; i++) {

// Suggested Fix:
// TODO: Add type annotation
        for (let i = 0; i < ITERATIONS; i++) {
```

- Line 98: Missing type annotation
```typescript
// Original:
          const search = new BaseSearchDto({

// Suggested Fix:
// TODO: Add type annotation
          const search = new BaseSearchDto({
```

- Line 115: Missing type annotation
```typescript
// Original:
      const avgTime = await measureExecutionTime(async () => {

// Suggested Fix:
// TODO: Add type annotation
      const avgTime = await measureExecutionTime(async () => {
```

- Line 116: Missing type annotation
```typescript
// Original:
        for (let i = 0; i < ITERATIONS; i++) {

// Suggested Fix:
// TODO: Add type annotation
        for (let i = 0; i < ITERATIONS; i++) {
```

- Line 117: Missing type annotation
```typescript
// Original:
          const validation = new BaseValidationDto({

// Suggested Fix:
// TODO: Add type annotation
          const validation = new BaseValidationDto({
```

- Line 135: Missing type annotation
```typescript
// Original:
      const avgTime = await measureExecutionTime(async () => {

// Suggested Fix:
// TODO: Add type annotation
      const avgTime = await measureExecutionTime(async () => {
```

- Line 136: Missing type annotation
```typescript
// Original:
        for (let i = 0; i < ITERATIONS; i++) {

// Suggested Fix:
// TODO: Add type annotation
        for (let i = 0; i < ITERATIONS; i++) {
```

- Line 137: Missing type annotation
```typescript
// Original:
          const request = new BaseRequestDto({

// Suggested Fix:
// TODO: Add type annotation
          const request = new BaseRequestDto({
```

- Line 165: Missing type annotation
```typescript
// Original:
      const initialMemory = process.memoryUsage().heapUsed;

// Suggested Fix:
// TODO: Add type annotation
      const initialMemory = process.memoryUsage().heapUsed;
```

- Line 168: Missing type annotation
```typescript
// Original:
      const dtos = [];

// Suggested Fix:
// TODO: Add type annotation
      const dtos = [];
```

- Line 169: Missing type annotation
```typescript
// Original:
      for (let i = 0; i < 10000; i++) {

// Suggested Fix:
// TODO: Add type annotation
      for (let i = 0; i < 10000; i++) {
```

- Line 192: Missing type annotation
```typescript
// Original:
      const finalMemory = process.memoryUsage().heapUsed;

// Suggested Fix:
// TODO: Add type annotation
      const finalMemory = process.memoryUsage().heapUsed;
```

- Line 193: Missing type annotation
```typescript
// Original:
      const memoryPerDto = (finalMemory - initialMemory) / 10000 / 1024; // KB per DTO

// Suggested Fix:
// TODO: Add type annotation
      const memoryPerDto = (finalMemory - initialMemory) / 10000 / 1024; // KB per DTO
```

- Line 202: Missing type annotation
```typescript
// Original:
      const dtos = {

// Suggested Fix:
// TODO: Add type annotation
      const dtos = {
```

- Line 211: Missing type annotation
```typescript
// Original:
      const avgTime = await measureExecutionTime(async () => {

// Suggested Fix:
// TODO: Add type annotation
      const avgTime = await measureExecutionTime(async () => {
```

- Line 212: Missing type annotation
```typescript
// Original:
        for (let i = 0; i < ITERATIONS; i++) {

// Suggested Fix:
// TODO: Add type annotation
        for (let i = 0; i < ITERATIONS; i++) {
```

- Line 214: Missing type annotation
```typescript
// Original:
            const serialized = JSON.stringify(dto);

// Suggested Fix:
// TODO: Add type annotation
            const serialized = JSON.stringify(dto);
```

## src/client/api/

### src\client\api\api.ts

- Line 11: Missing type annotation
```typescript
// Original:
export const api = axios.create({

// Suggested Fix:
// TODO: Add type annotation
export const api = axios.create({
```

- Line 22: Missing type annotation
```typescript
// Original:
    const token = localStorage.getItem('token');

// Suggested Fix:
// TODO: Add type annotation
    const token = localStorage.getItem('token');
```

- Line 41: Missing type annotation
```typescript
// Original:
    const axiosError = error as AxiosError;

// Suggested Fix:
// TODO: Add type annotation
    const axiosError = error as AxiosError;
```

### src\client\api\auth.client.ts

- Line 5: Missing type annotation
```typescript
// Original:
const AUTH_ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const AUTH_ENDPOINTS = {
```

- Line 18: Missing type annotation
```typescript
// Original:
    const response = await this.post<LoginResponse>(this.getEndpoint('LOGIN'), request);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.post<LoginResponse>(this.getEndpoint('LOGIN'), request);
```

- Line 30: Missing type annotation
```typescript
// Original:
    const response = await this.get<ValidateResponse>(this.getEndpoint('VALIDATE'));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<ValidateResponse>(this.getEndpoint('VALIDATE'));
```

- Line 38: Missing type annotation
```typescript
// Original:
    const response = await this.post<AuthenticatedUser>(this.getEndpoint('UPDATE'), user);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.post<AuthenticatedUser>(this.getEndpoint('UPDATE'), user);
```

- Line 47: Missing type annotation
```typescript
// Original:
const authClient = new AuthClient();

// Suggested Fix:
// TODO: Add type annotation
const authClient = new AuthClient();
```

- Line 50: Missing type annotation
```typescript
// Original:
export const login = authClient.login;

// Suggested Fix:
// TODO: Add type annotation
export const login = authClient.login;
```

- Line 51: Missing type annotation
```typescript
// Original:
export const logout = authClient.logout;

// Suggested Fix:
// TODO: Add type annotation
export const logout = authClient.logout;
```

- Line 52: Missing type annotation
```typescript
// Original:
export const validate = authClient.validate;

// Suggested Fix:
// TODO: Add type annotation
export const validate = authClient.validate;
```

- Line 53: Missing type annotation
```typescript
// Original:
export const updateUser = authClient.updateUser;

// Suggested Fix:
// TODO: Add type annotation
export const updateUser = authClient.updateUser;
```

### src\client\api\base.client.ts

- Line 35: Missing type annotation
```typescript
// Original:
        const token = localStorage.getItem('token');

// Suggested Fix:
// TODO: Add type annotation
        const token = localStorage.getItem('token');
```

- Line 53: Missing type annotation
```typescript
// Original:
        const axiosError = error as AxiosError;

// Suggested Fix:
// TODO: Add type annotation
        const axiosError = error as AxiosError;
```

- Line 66: Missing type annotation
```typescript
// Original:
      const response = await this.api.get<ApiResponse<T>>(endpoint, config);

// Suggested Fix:
// TODO: Add type annotation
      const response = await this.api.get<ApiResponse<T>>(endpoint, config);
```

- Line 75: Missing type annotation
```typescript
// Original:
      const response = await this.api.post<ApiResponse<T>>(endpoint, data, config);

// Suggested Fix:
// TODO: Add type annotation
      const response = await this.api.post<ApiResponse<T>>(endpoint, data, config);
```

- Line 84: Missing type annotation
```typescript
// Original:
      const response = await this.api.put<ApiResponse<T>>(endpoint, data, config);

// Suggested Fix:
// TODO: Add type annotation
      const response = await this.api.put<ApiResponse<T>>(endpoint, data, config);
```

- Line 93: Missing type annotation
```typescript
// Original:
      const response = await this.api.delete<ApiResponse<T>>(endpoint, config);

// Suggested Fix:
// TODO: Add type annotation
      const response = await this.api.delete<ApiResponse<T>>(endpoint, config);
```

- Line 101: Missing type annotation
```typescript
// Original:
    const endpoint = this.endpoints[key];

// Suggested Fix:
// TODO: Add type annotation
    const endpoint = this.endpoints[key];
```

### src\client\api\bookmarks.client.ts

- Line 4: Missing type annotation
```typescript
// Original:
const BOOKMARK_ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const BOOKMARK_ENDPOINTS = {
```

- Line 69: Missing type annotation
```typescript
// Original:
export const bookmarkClient = new BookmarkClient();

// Suggested Fix:
// TODO: Add type annotation
export const bookmarkClient = new BookmarkClient();
```

### src\client\api\chat.client.ts

- Line 24: Missing type annotation
```typescript
// Original:
const CHAT_ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const CHAT_ENDPOINTS = {
```

- Line 34: Missing type annotation
```typescript
// Original:
    const metadata = {

// Suggested Fix:
// TODO: Add type annotation
    const metadata = {
```

- Line 40: Missing type annotation
```typescript
// Original:
    const response = await this.post<ChatResponse>(this.getEndpoint('SEND'), {

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.post<ChatResponse>(this.getEndpoint('SEND'), {
```

- Line 49: Missing type annotation
```typescript
// Original:
export const chatClient = new ChatClient();

// Suggested Fix:
// TODO: Add type annotation
export const chatClient = new ChatClient();
```

### src\client\api\compression.ts

- Line 63: Missing type annotation
```typescript
// Original:
      const response = await api.get(`/api/compression/list/${hostId}/${archivePath}`);

// Suggested Fix:
// TODO: Add type annotation
      const response = await api.get(`/api/compression/list/${hostId}/${archivePath}`);
```

- Line 76: Missing type annotation
```typescript
// Original:
export const compressionApi = new CompressionApiClient();

// Suggested Fix:
// TODO: Add type annotation
export const compressionApi = new CompressionApiClient();
```

### src\client\api\docker.client.ts

- Line 27: Missing type annotation
```typescript
// Original:
    const response = await this.get<DockerContainer[]>(this.getEndpoint('CONTAINERS', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<DockerContainer[]>(this.getEndpoint('CONTAINERS', hostId));
```

- Line 51: Missing type annotation
```typescript
// Original:
    const response = await this.get<DockerStats>(this.getEndpoint('STATS', hostId, containerId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<DockerStats>(this.getEndpoint('STATS', hostId, containerId));
```

- Line 75: Missing type annotation
```typescript
// Original:
    const response = await this.get<DockerNetwork[]>(this.getEndpoint('NETWORKS', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<DockerNetwork[]>(this.getEndpoint('NETWORKS', hostId));
```

- Line 83: Missing type annotation
```typescript
// Original:
    const response = await this.get<DockerVolume[]>(this.getEndpoint('VOLUMES', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<DockerVolume[]>(this.getEndpoint('VOLUMES', hostId));
```

- Line 91: Missing type annotation
```typescript
// Original:
    const response = await this.get<string>(this.getEndpoint('LOGS', hostId, containerId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<string>(this.getEndpoint('LOGS', hostId, containerId));
```

- Line 99: Missing type annotation
```typescript
// Original:
    const response = await this.get<DockerComposeConfig[]>(this.getEndpoint('STACKS', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<DockerComposeConfig[]>(this.getEndpoint('STACKS', hostId));
```

- Line 123: Missing type annotation
```typescript
// Original:
    const response = await this.get<string>(`${this.getEndpoint('STACK', hostId, stackName)}/compose`);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<string>(`${this.getEndpoint('STACK', hostId, stackName)}/compose`);
```

- Line 136: Missing type annotation
```typescript
// Original:
const dockerClient = new DockerClient();

// Suggested Fix:
// TODO: Add type annotation
const dockerClient = new DockerClient();
```

- Line 139: Missing type annotation
```typescript
// Original:
export const listContainers = dockerClient.listContainers;

// Suggested Fix:
// TODO: Add type annotation
export const listContainers = dockerClient.listContainers;
```

- Line 140: Missing type annotation
```typescript
// Original:
export const getContainerStats = dockerClient.getContainerStats;

// Suggested Fix:
// TODO: Add type annotation
export const getContainerStats = dockerClient.getContainerStats;
```

- Line 141: Missing type annotation
```typescript
// Original:
export const startContainer = dockerClient.startContainer;

// Suggested Fix:
// TODO: Add type annotation
export const startContainer = dockerClient.startContainer;
```

- Line 142: Missing type annotation
```typescript
// Original:
export const stopContainer = dockerClient.stopContainer;

// Suggested Fix:
// TODO: Add type annotation
export const stopContainer = dockerClient.stopContainer;
```

- Line 143: Missing type annotation
```typescript
// Original:
export const restartContainer = dockerClient.restartContainer;

// Suggested Fix:
// TODO: Add type annotation
export const restartContainer = dockerClient.restartContainer;
```

- Line 144: Missing type annotation
```typescript
// Original:
export const removeContainer = dockerClient.removeContainer;

// Suggested Fix:
// TODO: Add type annotation
export const removeContainer = dockerClient.removeContainer;
```

- Line 145: Missing type annotation
```typescript
// Original:
export const listNetworks = dockerClient.listNetworks;

// Suggested Fix:
// TODO: Add type annotation
export const listNetworks = dockerClient.listNetworks;
```

- Line 146: Missing type annotation
```typescript
// Original:
export const listVolumes = dockerClient.listVolumes;

// Suggested Fix:
// TODO: Add type annotation
export const listVolumes = dockerClient.listVolumes;
```

- Line 147: Missing type annotation
```typescript
// Original:
export const getContainerLogs = dockerClient.getContainerLogs;

// Suggested Fix:
// TODO: Add type annotation
export const getContainerLogs = dockerClient.getContainerLogs;
```

- Line 148: Missing type annotation
```typescript
// Original:
export const getStacks = dockerClient.getStacks;

// Suggested Fix:
// TODO: Add type annotation
export const getStacks = dockerClient.getStacks;
```

- Line 149: Missing type annotation
```typescript
// Original:
export const createStack = dockerClient.createStack;

// Suggested Fix:
// TODO: Add type annotation
export const createStack = dockerClient.createStack;
```

- Line 150: Missing type annotation
```typescript
// Original:
export const deleteStack = dockerClient.deleteStack;

// Suggested Fix:
// TODO: Add type annotation
export const deleteStack = dockerClient.deleteStack;
```

- Line 151: Missing type annotation
```typescript
// Original:
export const startStack = dockerClient.startStack;

// Suggested Fix:
// TODO: Add type annotation
export const startStack = dockerClient.startStack;
```

- Line 152: Missing type annotation
```typescript
// Original:
export const stopStack = dockerClient.stopStack;

// Suggested Fix:
// TODO: Add type annotation
export const stopStack = dockerClient.stopStack;
```

- Line 153: Missing type annotation
```typescript
// Original:
export const getStackComposeFile = dockerClient.getStackComposeFile;

// Suggested Fix:
// TODO: Add type annotation
export const getStackComposeFile = dockerClient.getStackComposeFile;
```

- Line 154: Missing type annotation
```typescript
// Original:
export const updateStackComposeFile = dockerClient.updateStackComposeFile;

// Suggested Fix:
// TODO: Add type annotation
export const updateStackComposeFile = dockerClient.updateStackComposeFile;
```

### src\client\api\fileExplorer.client.ts

- Line 4: Missing type annotation
```typescript
// Original:
const FILE_ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const FILE_ENDPOINTS = {
```

- Line 20: Missing type annotation
```typescript
// Original:
    const response = await this.get<FileItem[]>(this.getEndpoint('LIST', hostId), {

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<FileItem[]>(this.getEndpoint('LIST', hostId), {
```

- Line 27: Missing type annotation
```typescript
// Original:
    const response = await this.get<string>(this.getEndpoint('READ', hostId), {

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<string>(this.getEndpoint('READ', hostId), {
```

- Line 60: Missing type annotation
```typescript
// Original:
    const response = await this.get<FileItem[]>(this.getEndpoint('SEARCH', hostId), {

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<FileItem[]>(this.getEndpoint('SEARCH', hostId), {
```

- Line 67: Missing type annotation
```typescript
// Original:
export const fileExplorerClient = new FileExplorerClient();

// Suggested Fix:
// TODO: Add type annotation
export const fileExplorerClient = new FileExplorerClient();
```

### src\client\api\files.client.ts

- Line 6: Using any type
```typescript
// Original:
  data?: any;

// Suggested Fix:
// TODO: Replace 'any' with specific type
  data?: any;
```

- Line 35: Missing type annotation
```typescript
// Original:
    const response = await fetch(`/api/hosts/${hostId}/files/folder`, {

// Suggested Fix:
// TODO: Add type annotation
    const response = await fetch(`/api/hosts/${hostId}/files/folder`, {
```

- Line 46: Missing type annotation
```typescript
// Original:
    const response = await fetch(`/api/hosts/${hostId}/files/rename`, {

// Suggested Fix:
// TODO: Add type annotation
    const response = await fetch(`/api/hosts/${hostId}/files/rename`, {
```

- Line 57: Missing type annotation
```typescript
// Original:
    const response = await fetch(`/api/hosts/${hostId}/files`, {

// Suggested Fix:
// TODO: Add type annotation
    const response = await fetch(`/api/hosts/${hostId}/files`, {
```

- Line 68: Missing type annotation
```typescript
// Original:
    const response = await fetch(`/api/hosts/${hostId}/files/move`, {

// Suggested Fix:
// TODO: Add type annotation
    const response = await fetch(`/api/hosts/${hostId}/files/move`, {
```

- Line 79: Missing type annotation
```typescript
// Original:
    const response = await fetch(`/api/hosts/${hostId}/files/copy`, {

// Suggested Fix:
// TODO: Add type annotation
    const response = await fetch(`/api/hosts/${hostId}/files/copy`, {
```

- Line 90: Missing type annotation
```typescript
// Original:
    const formData = new FormData();

// Suggested Fix:
// TODO: Add type annotation
    const formData = new FormData();
```

- Line 96: Missing type annotation
```typescript
// Original:
    const response = await fetch(`/api/hosts/${hostId}/files/upload`, {

// Suggested Fix:
// TODO: Add type annotation
    const response = await fetch(`/api/hosts/${hostId}/files/upload`, {
```

- Line 104: Missing type annotation
```typescript
// Original:
export const fileOperations = new FileOperationsClient();

// Suggested Fix:
// TODO: Add type annotation
export const fileOperations = new FileOperationsClient();
```

### src\client\api\filesystem.client.ts

- Line 30: Missing type annotation
```typescript
// Original:
    const response = await this.get<FileSystemLocation[]>('/api/fs/locations');

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<FileSystemLocation[]>('/api/fs/locations');
```

- Line 39: Missing type annotation
```typescript
// Original:
    const response = await this.post<FileSystemLocation>('/api/fs/locations', {

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.post<FileSystemLocation>('/api/fs/locations', {
```

- Line 57: Missing type annotation
```typescript
// Original:
    const response = await this.get<FileListResponse>(

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<FileListResponse>(
```

- Line 70: Missing type annotation
```typescript
// Original:
    const response = await this.get(`/api/fs/${locationId}/files/download`, {

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get(`/api/fs/${locationId}/files/download`, {
```

- Line 82: Missing type annotation
```typescript
// Original:
    const formData = new FormData();

// Suggested Fix:
// TODO: Add type annotation
    const formData = new FormData();
```

- Line 120: Missing type annotation
```typescript
// Original:
    const response = await this.get<Space[]>('/api/fs/spaces');

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<Space[]>('/api/fs/spaces');
```

- Line 125: Missing type annotation
```typescript
// Original:
    const response = await this.post<Space>('/api/fs/spaces', request);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.post<Space>('/api/fs/spaces', request);
```

- Line 130: Missing type annotation
```typescript
// Original:
    const response = await this.put<Space>(`/api/fs/spaces/${id}`, request);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.put<Space>(`/api/fs/spaces/${id}`, request);
```

- Line 140: Missing type annotation
```typescript
// Original:
    const response = await this.get<QuickAccessResponse>('/api/fs/quick-access');

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<QuickAccessResponse>('/api/fs/quick-access');
```

- Line 162: Missing type annotation
```typescript
// Original:
    const response = await this.post<FileItem[]>('/api/fs/select', request);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.post<FileItem[]>('/api/fs/select', request);
```

- Line 170: Using any type
```typescript
// Original:
    callback: (event: any) => void

// Suggested Fix:
// TODO: Replace 'any' with specific type
    callback: (event: any) => void
```

- Line 172: Missing type annotation
```typescript
// Original:
    const socket = this.getSocket();

// Suggested Fix:
// TODO: Add type annotation
    const socket = this.getSocket();
```

- Line 180: Using any type
```typescript
// Original:
    callback: (event: any) => void

// Suggested Fix:
// TODO: Replace 'any' with specific type
    callback: (event: any) => void
```

- Line 182: Missing type annotation
```typescript
// Original:
    const socket = this.getSocket();

// Suggested Fix:
// TODO: Add type annotation
    const socket = this.getSocket();
```

### src\client\api\hosts.client.ts

- Line 4: Missing type annotation
```typescript
// Original:
const HOST_ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const HOST_ENDPOINTS = {
```

- Line 23: Missing type annotation
```typescript
// Original:
    const response = await this.get<Host[]>(this.getEndpoint('LIST'));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<Host[]>(this.getEndpoint('LIST'));
```

- Line 28: Missing type annotation
```typescript
// Original:
    const response = await this.get<Host>(this.getEndpoint('GET', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<Host>(this.getEndpoint('GET', hostId));
```

- Line 33: Missing type annotation
```typescript
// Original:
    const response = await this.post<Host>(this.getEndpoint('CREATE'), host);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.post<Host>(this.getEndpoint('CREATE'), host);
```

- Line 38: Missing type annotation
```typescript
// Original:
    const response = await this.put<Host>(this.getEndpoint('UPDATE', hostId), host);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.put<Host>(this.getEndpoint('UPDATE', hostId), host);
```

- Line 52: Missing type annotation
```typescript
// Original:
    const response = await this.get<SystemStats>(this.getEndpoint('STATS', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<SystemStats>(this.getEndpoint('STATS', hostId));
```

- Line 65: Missing type annotation
```typescript
// Original:
    const response = await this.get<Host>(this.getEndpoint('STATUS', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<Host>(this.getEndpoint('STATUS', hostId));
```

- Line 70: Missing type annotation
```typescript
// Original:
export const hostsClient = new HostsClient();

// Suggested Fix:
// TODO: Add type annotation
export const hostsClient = new HostsClient();
```

- Line 73: Missing type annotation
```typescript
// Original:
export const listHosts = hostsClient.listHosts.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const listHosts = hostsClient.listHosts.bind(hostsClient);
```

- Line 74: Missing type annotation
```typescript
// Original:
export const getHost = hostsClient.getHost.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const getHost = hostsClient.getHost.bind(hostsClient);
```

- Line 75: Missing type annotation
```typescript
// Original:
export const createHost = hostsClient.createHost.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const createHost = hostsClient.createHost.bind(hostsClient);
```

- Line 76: Missing type annotation
```typescript
// Original:
export const updateHost = hostsClient.updateHost.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const updateHost = hostsClient.updateHost.bind(hostsClient);
```

- Line 77: Missing type annotation
```typescript
// Original:
export const deleteHost = hostsClient.deleteHost.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const deleteHost = hostsClient.deleteHost.bind(hostsClient);
```

- Line 78: Missing type annotation
```typescript
// Original:
export const testHost = hostsClient.testHost.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const testHost = hostsClient.testHost.bind(hostsClient);
```

- Line 79: Missing type annotation
```typescript
// Original:
export const getHostStats = hostsClient.getHostStats.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const getHostStats = hostsClient.getHostStats.bind(hostsClient);
```

- Line 80: Missing type annotation
```typescript
// Original:
export const connectHost = hostsClient.connectHost.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const connectHost = hostsClient.connectHost.bind(hostsClient);
```

- Line 81: Missing type annotation
```typescript
// Original:
export const disconnectHost = hostsClient.disconnectHost.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const disconnectHost = hostsClient.disconnectHost.bind(hostsClient);
```

- Line 82: Missing type annotation
```typescript
// Original:
export const getHostStatus = hostsClient.getHostStatus.bind(hostsClient);

// Suggested Fix:
// TODO: Add type annotation
export const getHostStatus = hostsClient.getHostStatus.bind(hostsClient);
```

### src\client\api\notifications.client.ts

- Line 20: Missing type annotation
```typescript
// Original:
const NOTIFICATION_ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const NOTIFICATION_ENDPOINTS = {
```

- Line 38: Missing type annotation
```typescript
// Original:
    const queryParams = new URLSearchParams({

// Suggested Fix:
// TODO: Add type annotation
    const queryParams = new URLSearchParams({
```

- Line 94: Missing type annotation
```typescript
// Original:
export const notificationsClient = new NotificationsClient();

// Suggested Fix:
// TODO: Add type annotation
export const notificationsClient = new NotificationsClient();
```

### src\client\api\packageManager.client.ts

- Line 4: Missing type annotation
```typescript
// Original:
const PACKAGE_ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const PACKAGE_ENDPOINTS = {
```

- Line 18: Missing type annotation
```typescript
// Original:
    const response = await this.get<Package[]>(this.getEndpoint('LIST', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<Package[]>(this.getEndpoint('LIST', hostId));
```

- Line 35: Missing type annotation
```typescript
// Original:
    const response = await this.get<Package[]>(this.getEndpoint('SEARCH', hostId), {

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<Package[]>(this.getEndpoint('SEARCH', hostId), {
```

- Line 42: Missing type annotation
```typescript
// Original:
export const packageManagerClient = new PackageManagerClient();

// Suggested Fix:
// TODO: Add type annotation
export const packageManagerClient = new PackageManagerClient();
```

### src\client\api\preferences.client.ts

- Line 12: Missing type annotation
```typescript
// Original:
const ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const ENDPOINTS = {
```

- Line 23: Missing type annotation
```typescript
// Original:
    const response = await this.get<UserPreferences>(this.getEndpoint('getPreferences'));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<UserPreferences>(this.getEndpoint('getPreferences'));
```

- Line 31: Missing type annotation
```typescript
// Original:
    const response = await this.put<UserPreferences>(this.getEndpoint('updatePreferences'), data);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.put<UserPreferences>(this.getEndpoint('updatePreferences'), data);
```

- Line 39: Missing type annotation
```typescript
// Original:
export const preferencesClient = new PreferencesClient();

// Suggested Fix:
// TODO: Add type annotation
export const preferencesClient = new PreferencesClient();
```

### src\client\api\remoteExecution.client.ts

- Line 4: Missing type annotation
```typescript
// Original:
const EXEC_ENDPOINTS = {

// Suggested Fix:
// TODO: Add type annotation
const EXEC_ENDPOINTS = {
```

- Line 18: Missing type annotation
```typescript
// Original:
    const response = await this.post<CommandResult>(this.getEndpoint('EXECUTE', hostId), command);

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.post<CommandResult>(this.getEndpoint('EXECUTE', hostId), command);
```

- Line 31: Missing type annotation
```typescript
// Original:
    const response = await this.get<CommandResult[]>(this.getEndpoint('LIST', hostId));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<CommandResult[]>(this.getEndpoint('LIST', hostId));
```

- Line 36: Missing type annotation
```typescript
// Original:
    const response = await this.get<CommandResult>(this.getEndpoint('STATUS', hostId, pid));

// Suggested Fix:
// TODO: Add type annotation
    const response = await this.get<CommandResult>(this.getEndpoint('STATUS', hostId, pid));
```

- Line 41: Missing type annotation
```typescript
// Original:
export const remoteExecutionClient = new RemoteExecutionClient();

// Suggested Fix:
// TODO: Add type annotation
export const remoteExecutionClient = new RemoteExecutionClient();
```

- Line 44: Missing type annotation
```typescript
// Original:
export const executeCommand = remoteExecutionClient.executeCommand.bind(remoteExecutionClient);

// Suggested Fix:
// TODO: Add type annotation
export const executeCommand = remoteExecutionClient.executeCommand.bind(remoteExecutionClient);
```

- Line 45: Missing type annotation
```typescript
// Original:
export const streamCommand = remoteExecutionClient.streamCommand.bind(remoteExecutionClient);

// Suggested Fix:
// TODO: Add type annotation
export const streamCommand = remoteExecutionClient.streamCommand.bind(remoteExecutionClient);
```

- Line 46: Missing type annotation
```typescript
// Original:
export const killCommand = remoteExecutionClient.killCommand.bind(remoteExecutionClient);

// Suggested Fix:
// TODO: Add type annotation
export const killCommand = remoteExecutionClient.killCommand.bind(remoteExecutionClient);
```

- Line 47: Missing type annotation
```typescript
// Original:
export const listProcesses = remoteExecutionClient.listProcesses.bind(remoteExecutionClient);

// Suggested Fix:
// TODO: Add type annotation
export const listProcesses = remoteExecutionClient.listProcesses.bind(remoteExecutionClient);
```

- Line 48: Missing type annotation
```typescript
// Original:
export const getProcessStatus = remoteExecutionClient.getProcessStatus.bind(remoteExecutionClient);

// Suggested Fix:
// TODO: Add type annotation
export const getProcessStatus = remoteExecutionClient.getProcessStatus.bind(remoteExecutionClient);
```

### src\client\api\settings.client.ts

- Line 18: Missing type annotation
```typescript
// Original:
    const response = await apiClient.get<Settings['user']>('/api/settings/user');

// Suggested Fix:
// TODO: Add type annotation
    const response = await apiClient.get<Settings['user']>('/api/settings/user');
```

- Line 26: Missing type annotation
```typescript
// Original:
    const response = await apiClient.patch<SettingsResponse>('/api/settings/user', {

// Suggested Fix:
// TODO: Add type annotation
    const response = await apiClient.patch<SettingsResponse>('/api/settings/user', {
```

- Line 34: Missing type annotation
```typescript
// Original:
    const response = await apiClient.post<SettingsResponse>('/api/settings/user/reset');

// Suggested Fix:
// TODO: Add type annotation
    const response = await apiClient.post<SettingsResponse>('/api/settings/user/reset');
```

- Line 40: Missing type annotation
```typescript
// Original:
    const response = await apiClient.get<Settings['admin']>('/api/settings/admin');

// Suggested Fix:
// TODO: Add type annotation
    const response = await apiClient.get<Settings['admin']>('/api/settings/admin');
```

- Line 48: Missing type annotation
```typescript
// Original:
    const response = await apiClient.patch<SettingsResponse>('/api/settings/admin', {

// Suggested Fix:
// TODO: Add type annotation
    const response = await apiClient.patch<SettingsResponse>('/api/settings/admin', {
```

- Line 56: Missing type annotation
```typescript
// Original:
export const settingsClient = SettingsClient.getInstance();

// Suggested Fix:
// TODO: Add type annotation
export const settingsClient = SettingsClient.getInstance();
```

## src/client/components/

### src\client\components\AgentConnectionManager.tsx

- Line 58: Missing type annotation
```typescript
// Original:
  const loadHostStatus = useCallback(async () => {

// Suggested Fix:
// TODO: Add type annotation
  const loadHostStatus = useCallback(async () => {
```

- Line 67: Missing type annotation
```typescript
// Original:
      const data = await getHostStatus(hostId);

// Suggested Fix:
// TODO: Add type annotation
      const data = await getHostStatus(hostId);
```

- Line 90: Missing type annotation
```typescript
// Original:
  const handleConnect = useCallback(async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleConnect = useCallback(async () => {
```

- Line 120: Missing type annotation
```typescript
// Original:
  const handleDisconnect = useCallback(async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleDisconnect = useCallback(async () => {
```

- Line 171: Missing type annotation
```typescript
// Original:
  const speedDialActions = [

// Suggested Fix:
// TODO: Add type annotation
  const speedDialActions = [
```

### src\client\components\BookmarkButton.tsx

- Line 15: Function parameter missing type
```typescript
// Original:
export function BookmarkButton({ file, hostId }: BookmarkButtonProps) {

// Suggested Fix:
// TODO: Add parameter type
export function BookmarkButton({ file, hostId }: BookmarkButtonProps) {
```

- Line 28: Missing type annotation
```typescript
// Original:
  const existingBookmark = getBookmark(hostId, file.path);

// Suggested Fix:
// TODO: Add type annotation
  const existingBookmark = getBookmark(hostId, file.path);
```

- Line 29: Missing type annotation
```typescript
// Original:
  const isCurrentlyBookmarked = isBookmarked(hostId, file.path);

// Suggested Fix:
// TODO: Add type annotation
  const isCurrentlyBookmarked = isBookmarked(hostId, file.path);
```

### src\client\components\BookmarkDialog.tsx

- Line 31: Missing type annotation
```typescript
// Original:
  const handleConfirm = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleConfirm = () => {
```

### src\client\components\BookmarkList.tsx

- Line 62: Missing type annotation
```typescript
// Original:
  const hostBookmarks = bookmarks.filter(b => b.hostId === hostId);

// Suggested Fix:
// TODO: Add type annotation
  const hostBookmarks = bookmarks.filter(b => b.hostId === hostId);
```

### src\client\components\BulkOperationProgress.tsx

- Line 26: Function parameter missing type
```typescript
// Original:
export function BulkOperationProgress({ operations, onClose }: BulkOperationProgressProps) {

// Suggested Fix:
// TODO: Add parameter type
export function BulkOperationProgress({ operations, onClose }: BulkOperationProgressProps) {
```

- Line 27: Missing type annotation
```typescript
// Original:
  const hasIncompleteOperations = operations.some(op => !op.completed);

// Suggested Fix:
// TODO: Add type annotation
  const hasIncompleteOperations = operations.some(op => !op.completed);
```

### src\client\components\Chat.tsx

- Line 28: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 29: Missing type annotation
```typescript
// Original:
  const messagesEndRef = useRef<HTMLDivElement>(null);

// Suggested Fix:
// TODO: Add type annotation
  const messagesEndRef = useRef<HTMLDivElement>(null);
```

- Line 30: Missing type annotation
```typescript
// Original:
  const inputRef = useRef<HTMLInputElement>(null);

// Suggested Fix:
// TODO: Add type annotation
  const inputRef = useRef<HTMLInputElement>(null);
```

- Line 43: Missing type annotation
```typescript
// Original:
  const handleSend = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSend = async () => {
```

### src\client\components\ChatBot.tsx

- Line 29: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 30: Missing type annotation
```typescript
// Original:
  const messagesEndRef = useRef<HTMLDivElement>(null);

// Suggested Fix:
// TODO: Add type annotation
  const messagesEndRef = useRef<HTMLDivElement>(null);
```

- Line 31: Missing type annotation
```typescript
// Original:
  const inputRef = useRef<HTMLInputElement>(null);

// Suggested Fix:
// TODO: Add type annotation
  const inputRef = useRef<HTMLInputElement>(null);
```

- Line 52: Missing type annotation
```typescript
// Original:
  const handleSend = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSend = async () => {
```

- Line 79: Missing type annotation
```typescript
// Original:
  const handleClear = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleClear = () => {
```

### src\client\components\ChatDialog.tsx

- Line 18: Function parameter missing type
```typescript
// Original:
export function ChatDialog({ open, onClose }: ChatDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function ChatDialog({ open, onClose }: ChatDialogProps) {
```

- Line 19: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 20: Missing type annotation
```typescript
// Original:
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

// Suggested Fix:
// TODO: Add type annotation
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
```

### src\client\components\CompressionDialog.tsx

- Line 30: Missing type annotation
```typescript
// Original:
const compressionFormats = [

// Suggested Fix:
// TODO: Add type annotation
const compressionFormats = [
```

- Line 50: Missing type annotation
```typescript
// Original:
  const handleSubmit = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSubmit = async () => {
```

- Line 62: Missing type annotation
```typescript
// Original:
        const finalTargetPath = targetPath.endsWith(`.${format}`)

// Suggested Fix:
// TODO: Add type annotation
        const finalTargetPath = targetPath.endsWith(`.${format}`)
```

### src\client\components\Dashboard.tsx

- Line 62: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

### src\client\components\DockerCompose.tsx

- Line 44: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 62: Missing type annotation
```typescript
// Original:
    const loadConfig = async () => {

// Suggested Fix:
// TODO: Add type annotation
    const loadConfig = async () => {
```

- Line 64: Missing type annotation
```typescript
// Original:
        const config = await getConfig(configName);

// Suggested Fix:
// TODO: Add type annotation
        const config = await getConfig(configName);
```

- Line 109: Missing type annotation
```typescript
// Original:
  const handleSave = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSave = async () => {
```

### src\client\components\DockerContainers.tsx

- Line 56: Function parameter missing type
```typescript
// Original:
export function DockerContainers({ hostId, containers, onRefresh }: DockerContainersProps) {

// Suggested Fix:
// TODO: Add parameter type
export function DockerContainers({ hostId, containers, onRefresh }: DockerContainersProps) {
```

- Line 56: Function parameter missing type
```typescript
// Original:
export function DockerContainers({ hostId, containers, onRefresh }: DockerContainersProps) {

// Suggested Fix:
// TODO: Add parameter type
export function DockerContainers({ hostId, containers, onRefresh }: DockerContainersProps) {
```

- Line 57: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 64: Missing type annotation
```typescript
// Original:
  const filteredContainers = useMemo(() => {

// Suggested Fix:
// TODO: Add type annotation
  const filteredContainers = useMemo(() => {
```

- Line 67: Missing type annotation
```typescript
// Original:
      const searchString = searchTerm.toLowerCase();

// Suggested Fix:
// TODO: Add type annotation
      const searchString = searchTerm.toLowerCase();
```

- Line 80: Missing type annotation
```typescript
// Original:
  const handleFilterClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleFilterClose = () => {
```

- Line 88: Missing type annotation
```typescript
// Original:
  const handleClearSearch = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleClearSearch = () => {
```

- Line 92: Missing type annotation
```typescript
// Original:
  const handleContainerAction = async (

// Suggested Fix:
// TODO: Add type annotation
  const handleContainerAction = async (
```

- Line 127: Missing type annotation
```typescript
// Original:
  const handleConfirmDelete = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleConfirmDelete = async () => {
```

### src\client\components\DockerManager.tsx

- Line 79: Function parameter missing type
```typescript
// Original:
export function DockerManager({ hostId, userId }: DockerManagerProps) {

// Suggested Fix:
// TODO: Add parameter type
export function DockerManager({ hostId, userId }: DockerManagerProps) {
```

- Line 80: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 82: Missing type annotation
```typescript
// Original:
  const containers = useSelector(selectAllContainers);

// Suggested Fix:
// TODO: Add type annotation
  const containers = useSelector(selectAllContainers);
```

- Line 83: Missing type annotation
```typescript
// Original:
  const loading = useSelector(selectIsLoading);

// Suggested Fix:
// TODO: Add type annotation
  const loading = useSelector(selectIsLoading);
```

- Line 84: Missing type annotation
```typescript
// Original:
  const error = useSelector(selectError);

// Suggested Fix:
// TODO: Add type annotation
  const error = useSelector(selectError);
```

- Line 94: Missing type annotation
```typescript
// Original:
  const handleRefresh = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleRefresh = async () => {
```

- Line 105: Missing type annotation
```typescript
// Original:
  const handleMenuClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleMenuClose = () => {
```

- Line 110: Missing type annotation
```typescript
// Original:
    const interval = setInterval(refresh, 30000); // Auto-refresh every 30 seconds

// Suggested Fix:
// TODO: Add type annotation
    const interval = setInterval(refresh, 30000); // Auto-refresh every 30 seconds
```

- Line 135: Missing type annotation
```typescript
// Original:
    const value = stats[key];

// Suggested Fix:
// TODO: Add type annotation
    const value = stats[key];
```

### src\client\components\FileBreadcrumbs.tsx

- Line 11: Function parameter missing type
```typescript
// Original:
export function FileBreadcrumbs({ hostId, path }: FileBreadcrumbsProps) {

// Suggested Fix:
// TODO: Add parameter type
export function FileBreadcrumbs({ hostId, path }: FileBreadcrumbsProps) {
```

- Line 12: Missing type annotation
```typescript
// Original:
  const navigate = useNavigate();

// Suggested Fix:
// TODO: Add type annotation
  const navigate = useNavigate();
```

- Line 15: Missing type annotation
```typescript
// Original:
  const segments = path.split('/').filter(Boolean);

// Suggested Fix:
// TODO: Add type annotation
  const segments = path.split('/').filter(Boolean);
```

- Line 16: Missing type annotation
```typescript
// Original:
  const breadcrumbItems = segments.map((segment, index) => {

// Suggested Fix:
// TODO: Add type annotation
  const breadcrumbItems = segments.map((segment, index) => {
```

- Line 18: Missing type annotation
```typescript
// Original:
    const segmentPath = '/' + segments.slice(0, index + 1).join('/');

// Suggested Fix:
// TODO: Add type annotation
    const segmentPath = '/' + segments.slice(0, index + 1).join('/');
```

- Line 45: Missing type annotation
```typescript
// Original:
        const isLast = index === breadcrumbItems.length - 1;

// Suggested Fix:
// TODO: Add type annotation
        const isLast = index === breadcrumbItems.length - 1;
```

### src\client\components\FileContextMenu.tsx

- Line 49: Missing type annotation
```typescript
// Original:
  const open = Boolean(anchorPosition);

// Suggested Fix:
// TODO: Add type annotation
  const open = Boolean(anchorPosition);
```

- Line 50: Missing type annotation
```typescript
// Original:
  const multipleSelected = selectedFiles.length > 1;

// Suggested Fix:
// TODO: Add type annotation
  const multipleSelected = selectedFiles.length > 1;
```

- Line 57: Missing type annotation
```typescript
// Original:
  const handleOpenWithClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleOpenWithClose = () => {
```

### src\client\components\FileExplorer\ShareDialog.tsx

- Line 33: Using any type
```typescript
// Original:
  onShare: (shareConfig: any) => Promise<any>;

// Suggested Fix:
// TODO: Replace 'any' with specific type
  onShare: (shareConfig: any) => Promise<any>;
```

- Line 71: Missing type annotation
```typescript
// Original:
  const validateForm = () => {

// Suggested Fix:
// TODO: Add type annotation
  const validateForm = () => {
```

- Line 80: Missing type annotation
```typescript
// Original:
  const handleSubmit = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSubmit = async () => {
```

- Line 88: Missing type annotation
```typescript
// Original:
      const shareConfig = {

// Suggested Fix:
// TODO: Add type annotation
      const shareConfig = {
```

- Line 95: Missing type annotation
```typescript
// Original:
      const result = await onShare(shareConfig);

// Suggested Fix:
// TODO: Add type annotation
      const result = await onShare(shareConfig);
```

- Line 109: Missing type annotation
```typescript
// Original:
  const handleCopyUrl = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleCopyUrl = async () => {
```

- Line 127: Missing type annotation
```typescript
// Original:
  const handleClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleClose = () => {
```

### src\client\components\FileExplorer\SharesManager.tsx

- Line 37: Using any type
```typescript
// Original:
  onModifyShare: (shareId: string, modifications: any) => Promise<any>;

// Suggested Fix:
// TODO: Replace 'any' with specific type
  onModifyShare: (shareId: string, modifications: any) => Promise<any>;
```

- Line 54: Missing type annotation
```typescript
// Original:
  const fetchShares = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const fetchShares = async () => {
```

- Line 57: Missing type annotation
```typescript
// Original:
      const result = await onFetchShares();

// Suggested Fix:
// TODO: Add type annotation
      const result = await onFetchShares();
```

### src\client\components\FileExplorer.tsx

- Line 45: Missing type annotation
```typescript
// Original:
  const navigate = useNavigate();

// Suggested Fix:
// TODO: Add type annotation
  const navigate = useNavigate();
```

- Line 69: Missing type annotation
```typescript
// Original:
  const logger = useLogger();

// Suggested Fix:
// TODO: Add type annotation
  const logger = useLogger();
```

- Line 70: Missing type annotation
```typescript
// Original:
  const handleError = useErrorHandler();

// Suggested Fix:
// TODO: Add type annotation
  const handleError = useErrorHandler();
```

- Line 98: Missing type annotation
```typescript
// Original:
      let comparison = 0;

// Suggested Fix:
// TODO: Add type annotation
      let comparison = 0;
```

- Line 115: Missing type annotation
```typescript
// Original:
  const loadFiles = useCallback(async () => {

// Suggested Fix:
// TODO: Add type annotation
  const loadFiles = useCallback(async () => {
```

- Line 118: Missing type annotation
```typescript
// Original:
    const loadingId = startLoading('Loading files...');

// Suggested Fix:
// TODO: Add type annotation
    const loadingId = startLoading('Loading files...');
```

- Line 130: Missing type annotation
```typescript
// Original:
      const cachedFiles = getCachedFiles(hostId, path);

// Suggested Fix:
// TODO: Add type annotation
      const cachedFiles = getCachedFiles(hostId, path);
```

- Line 143: Missing type annotation
```typescript
// Original:
      const response = await fileOperations.listFiles(hostId, path);

// Suggested Fix:
// TODO: Add type annotation
      const response = await fileOperations.listFiles(hostId, path);
```

- Line 171: Missing type annotation
```typescript
// Original:
    const loadingId = startLoading(`${operationName}...`);

// Suggested Fix:
// TODO: Add type annotation
    const loadingId = startLoading(`${operationName}...`);
```

- Line 277: Missing type annotation
```typescript
// Original:
  const handleRefresh = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleRefresh = () => {
```

- Line 308: Missing type annotation
```typescript
// Original:
      const fileIndex = files.findIndex(f => f.path === file.path);

// Suggested Fix:
// TODO: Add type annotation
      const fileIndex = files.findIndex(f => f.path === file.path);
```

- Line 309: Missing type annotation
```typescript
// Original:
      const lastSelectedIndex = files.findIndex(f => f.path === selectedFiles[selectedFiles.length - 1].path);

// Suggested Fix:
// TODO: Add type annotation
      const lastSelectedIndex = files.findIndex(f => f.path === selectedFiles[selectedFiles.length - 1].path);
```

- Line 313: Missing type annotation
```typescript
// Original:
      for (let i = 0; i < files.length; i++) {

// Suggested Fix:
// TODO: Add type annotation
      for (let i = 0; i < files.length; i++) {
```

- Line 338: Missing type annotation
```typescript
// Original:
  const handleCloseContextMenu = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleCloseContextMenu = () => {
```

- Line 345: Missing type annotation
```typescript
// Original:
      const result = await fileOperations.createFolder(hostId, path, name);

// Suggested Fix:
// TODO: Add type annotation
      const result = await fileOperations.createFolder(hostId, path, name);
```

- Line 362: Missing type annotation
```typescript
// Original:
      const oldPath = contextMenu.file.path;

// Suggested Fix:
// TODO: Add type annotation
      const oldPath = contextMenu.file.path;
```

- Line 363: Missing type annotation
```typescript
// Original:
      const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;

// Suggested Fix:
// TODO: Add type annotation
      const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
```

- Line 365: Missing type annotation
```typescript
// Original:
      const result = await fileOperations.renameFile(hostId, oldPath, newPath);

// Suggested Fix:
// TODO: Add type annotation
      const result = await fileOperations.renameFile(hostId, oldPath, newPath);
```

- Line 377: Missing type annotation
```typescript
// Original:
  const handleDelete = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleDelete = async () => {
```

- Line 380: Missing type annotation
```typescript
// Original:
    const operationId = `delete-${Date.now()}`;

// Suggested Fix:
// TODO: Add type annotation
    const operationId = `delete-${Date.now()}`;
```

- Line 381: Missing type annotation
```typescript
// Original:
    const totalFiles = selectedFiles.length;

// Suggested Fix:
// TODO: Add type annotation
    const totalFiles = selectedFiles.length;
```

- Line 384: Missing type annotation
```typescript
// Original:
      for (let i = 0; i < selectedFiles.length; i++) {

// Suggested Fix:
// TODO: Add type annotation
      for (let i = 0; i < selectedFiles.length; i++) {
```

- Line 385: Missing type annotation
```typescript
// Original:
        const file = selectedFiles[i];

// Suggested Fix:
// TODO: Add type annotation
        const file = selectedFiles[i];
```

- Line 386: Missing type annotation
```typescript
// Original:
        const progress = ((i + 1) / totalFiles) * 100;

// Suggested Fix:
// TODO: Add type annotation
        const progress = ((i + 1) / totalFiles) * 100;
```

- Line 403: Missing type annotation
```typescript
// Original:
    const files = event.target.files;

// Suggested Fix:
// TODO: Add type annotation
    const files = event.target.files;
```

- Line 406: Missing type annotation
```typescript
// Original:
    const operationId = `upload-${Date.now()}`;

// Suggested Fix:
// TODO: Add type annotation
    const operationId = `upload-${Date.now()}`;
```

- Line 407: Missing type annotation
```typescript
// Original:
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);

// Suggested Fix:
// TODO: Add type annotation
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
```

- Line 408: Missing type annotation
```typescript
// Original:
    let uploadedSize = 0;

// Suggested Fix:
// TODO: Add type annotation
    let uploadedSize = 0;
```

- Line 411: Missing type annotation
```typescript
// Original:
      for (let i = 0; i < files.length; i++) {

// Suggested Fix:
// TODO: Add type annotation
      for (let i = 0; i < files.length; i++) {
```

- Line 412: Missing type annotation
```typescript
// Original:
        const file = files[i];

// Suggested Fix:
// TODO: Add type annotation
        const file = files[i];
```

- Line 415: Missing type annotation
```typescript
// Original:
          const totalProgress = (uploadedSize / totalSize) * 100;

// Suggested Fix:
// TODO: Add type annotation
          const totalProgress = (uploadedSize / totalSize) * 100;
```

- Line 432: Missing type annotation
```typescript
// Original:
  const handleCopy = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleCopy = () => {
```

- Line 437: Missing type annotation
```typescript
// Original:
  const handleCut = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleCut = () => {
```

- Line 442: Missing type annotation
```typescript
// Original:
  const handlePaste = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handlePaste = async () => {
```

- Line 445: Missing type annotation
```typescript
// Original:
    const operationId = `paste-${Date.now()}`;

// Suggested Fix:
// TODO: Add type annotation
    const operationId = `paste-${Date.now()}`;
```

- Line 447: Missing type annotation
```typescript
// Original:
    const totalFiles = clipboard.files.length;

// Suggested Fix:
// TODO: Add type annotation
    const totalFiles = clipboard.files.length;
```

- Line 450: Missing type annotation
```typescript
// Original:
      for (let i = 0; i < clipboard.files.length; i++) {

// Suggested Fix:
// TODO: Add type annotation
      for (let i = 0; i < clipboard.files.length; i++) {
```

- Line 451: Missing type annotation
```typescript
// Original:
        const file = clipboard.files[i];

// Suggested Fix:
// TODO: Add type annotation
        const file = clipboard.files[i];
```

- Line 452: Missing type annotation
```typescript
// Original:
        const progress = ((i + 1) / totalFiles) * 100;

// Suggested Fix:
// TODO: Add type annotation
        const progress = ((i + 1) / totalFiles) * 100;
```

- Line 491: Missing type annotation
```typescript
// Original:
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));

// Suggested Fix:
// TODO: Add type annotation
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));
```

- Line 504: Missing type annotation
```typescript
// Original:
      const targetPath = targetFile.path;

// Suggested Fix:
// TODO: Add type annotation
      const targetPath = targetFile.path;
```

- Line 505: Missing type annotation
```typescript
// Original:
      const request = {

// Suggested Fix:
// TODO: Add type annotation
      const request = {
```

- Line 511: Missing type annotation
```typescript
// Original:
      const result = await fileOperations.move(hostId, request);

// Suggested Fix:
// TODO: Add type annotation
      const result = await fileOperations.move(hostId, request);
```

- Line 530: Missing type annotation
```typescript
// Original:
  const handleCompressFiles = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleCompressFiles = () => {
```

- Line 535: Missing type annotation
```typescript
// Original:
  const handleExtractFiles = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleExtractFiles = () => {
```

- Line 545: Missing type annotation
```typescript
// Original:
      const existingOpIndex = prevOperations.findIndex(op => op.id === operationId);

// Suggested Fix:
// TODO: Add type annotation
      const existingOpIndex = prevOperations.findIndex(op => op.id === operationId);
```

- Line 547: Missing type annotation
```typescript
// Original:
        const newOperations = [...prevOperations];

// Suggested Fix:
// TODO: Add type annotation
        const newOperations = [...prevOperations];
```

- Line 564: Missing type annotation
```typescript
// Original:
  const renderContent = () => {

// Suggested Fix:
// TODO: Add type annotation
  const renderContent = () => {
```

- Line 589: Missing type annotation
```typescript
// Original:
    const sortedFiles = [...files].sort((a, b) => {

// Suggested Fix:
// TODO: Add type annotation
    const sortedFiles = [...files].sort((a, b) => {
```

### src\client\components\FileGridItem.tsx

- Line 7: Missing type annotation
```typescript
// Original:
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

// Suggested Fix:
// TODO: Add type annotation
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
```

- Line 37: Missing type annotation
```typescript
// Original:
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

// Suggested Fix:
// TODO: Add type annotation
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
```

- Line 69: Missing type annotation
```typescript
// Original:
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

// Suggested Fix:
// TODO: Add type annotation
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
```

### src\client\components\FileListItem.tsx

- Line 43: Missing type annotation
```typescript
// Original:
    const ext = file.name.split('.').pop()?.toLowerCase();

// Suggested Fix:
// TODO: Add type annotation
    const ext = file.name.split('.').pop()?.toLowerCase();
```

### src\client\components\FileOperationDialogs.tsx

- Line 21: Function parameter missing type
```typescript
// Original:
export function NewFolderDialog({ open, onClose, onConfirm, error }: NewFolderDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function NewFolderDialog({ open, onClose, onConfirm, error }: NewFolderDialogProps) {
```

- Line 21: Function parameter missing type
```typescript
// Original:
export function NewFolderDialog({ open, onClose, onConfirm, error }: NewFolderDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function NewFolderDialog({ open, onClose, onConfirm, error }: NewFolderDialogProps) {
```

- Line 21: Function parameter missing type
```typescript
// Original:
export function NewFolderDialog({ open, onClose, onConfirm, error }: NewFolderDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function NewFolderDialog({ open, onClose, onConfirm, error }: NewFolderDialogProps) {
```

- Line 24: Missing type annotation
```typescript
// Original:
  const handleConfirm = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleConfirm = () => {
```

- Line 64: Function parameter missing type
```typescript
// Original:
export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {
```

- Line 64: Function parameter missing type
```typescript
// Original:
export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {
```

- Line 64: Function parameter missing type
```typescript
// Original:
export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {
```

- Line 64: Function parameter missing type
```typescript
// Original:
export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {
```

- Line 71: Missing type annotation
```typescript
// Original:
  const handleConfirm = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleConfirm = () => {
```

- Line 114: Function parameter missing type
```typescript
// Original:
export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {
```

- Line 114: Function parameter missing type
```typescript
// Original:
export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {
```

- Line 114: Function parameter missing type
```typescript
// Original:
export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {
```

- Line 114: Function parameter missing type
```typescript
// Original:
export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {

// Suggested Fix:
// TODO: Add parameter type
export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {
```

- Line 115: Missing type annotation
```typescript
// Original:
  const multipleFiles = files.length > 1;

// Suggested Fix:
// TODO: Add type annotation
  const multipleFiles = files.length > 1;
```

- Line 116: Missing type annotation
```typescript
// Original:
  const title = multipleFiles

// Suggested Fix:
// TODO: Add type annotation
  const title = multipleFiles
```

- Line 119: Missing type annotation
```typescript
// Original:
  const message = multipleFiles

// Suggested Fix:
// TODO: Add type annotation
  const message = multipleFiles
```

### src\client\components\FilePreview.tsx

- Line 19: Missing type annotation
```typescript
// Original:
const MAX_TEXT_SIZE = 1024 * 1024; // 1MB

// Suggested Fix:
// TODO: Add type annotation
const MAX_TEXT_SIZE = 1024 * 1024; // 1MB
```

- Line 20: Missing type annotation
```typescript
// Original:
const TEXT_EXTENSIONS = [

// Suggested Fix:
// TODO: Add type annotation
const TEXT_EXTENSIONS = [
```

- Line 27: Missing type annotation
```typescript
// Original:
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

// Suggested Fix:
// TODO: Add type annotation
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
```

- Line 28: Missing type annotation
```typescript
// Original:
const PDF_EXTENSIONS = ['pdf'];

// Suggested Fix:
// TODO: Add type annotation
const PDF_EXTENSIONS = ['pdf'];
```

- Line 29: Missing type annotation
```typescript
// Original:
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov'];

// Suggested Fix:
// TODO: Add type annotation
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov'];
```

- Line 30: Missing type annotation
```typescript
// Original:
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];

// Suggested Fix:
// TODO: Add type annotation
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
```

- Line 39: Function parameter missing type
```typescript
// Original:
export function FilePreview({ open, file, hostId, onClose }: FilePreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function FilePreview({ open, file, hostId, onClose }: FilePreviewProps) {
```

- Line 39: Function parameter missing type
```typescript
// Original:
export function FilePreview({ open, file, hostId, onClose }: FilePreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function FilePreview({ open, file, hostId, onClose }: FilePreviewProps) {
```

- Line 39: Function parameter missing type
```typescript
// Original:
export function FilePreview({ open, file, hostId, onClose }: FilePreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function FilePreview({ open, file, hostId, onClose }: FilePreviewProps) {
```

- Line 51: Missing type annotation
```typescript
// Original:
    const fetchContent = async () => {

// Suggested Fix:
// TODO: Add type annotation
    const fetchContent = async () => {
```

- Line 56: Missing type annotation
```typescript
// Original:
        const response = await fetch(`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(file.path)}`);

// Suggested Fix:
// TODO: Add type annotation
        const response = await fetch(`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(file.path)}`);
```

- Line 57: Missing type annotation
```typescript
// Original:
        const data = await response.json();

// Suggested Fix:
// TODO: Add type annotation
        const data = await response.json();
```

- Line 77: Missing type annotation
```typescript
// Original:
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

// Suggested Fix:
// TODO: Add type annotation
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
```

- Line 82: Missing type annotation
```typescript
// Original:
    const ext = filename.split('.').pop()?.toLowerCase() || '';

// Suggested Fix:
// TODO: Add type annotation
    const ext = filename.split('.').pop()?.toLowerCase() || '';
```

- Line 87: Missing type annotation
```typescript
// Original:
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

// Suggested Fix:
// TODO: Add type annotation
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
```

- Line 92: Missing type annotation
```typescript
// Original:
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

// Suggested Fix:
// TODO: Add type annotation
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
```

- Line 97: Missing type annotation
```typescript
// Original:
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

// Suggested Fix:
// TODO: Add type annotation
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
```

- Line 102: Missing type annotation
```typescript
// Original:
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

// Suggested Fix:
// TODO: Add type annotation
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
```

### src\client\components\FilePreviewModal.tsx

- Line 36: Function parameter missing type
```typescript
// Original:
export function FilePreviewModal({ open, onClose, file, hostId }: FilePreviewModalProps) {

// Suggested Fix:
// TODO: Add parameter type
export function FilePreviewModal({ open, onClose, file, hostId }: FilePreviewModalProps) {
```

- Line 36: Function parameter missing type
```typescript
// Original:
export function FilePreviewModal({ open, onClose, file, hostId }: FilePreviewModalProps) {

// Suggested Fix:
// TODO: Add parameter type
export function FilePreviewModal({ open, onClose, file, hostId }: FilePreviewModalProps) {
```

- Line 36: Function parameter missing type
```typescript
// Original:
export function FilePreviewModal({ open, onClose, file, hostId }: FilePreviewModalProps) {

// Suggested Fix:
// TODO: Add parameter type
export function FilePreviewModal({ open, onClose, file, hostId }: FilePreviewModalProps) {
```

- Line 37: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 44: Missing type annotation
```typescript
// Original:
  const handleZoomIn = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleZoomIn = () => {
```

- Line 46: Missing type annotation
```typescript
// Original:
      const newZoom = Math.min(prev + 0.25, 3);

// Suggested Fix:
// TODO: Add type annotation
      const newZoom = Math.min(prev + 0.25, 3);
```

- Line 52: Missing type annotation
```typescript
// Original:
  const handleZoomOut = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleZoomOut = () => {
```

- Line 54: Missing type annotation
```typescript
// Original:
      const newZoom = Math.max(prev - 0.25, 0.25);

// Suggested Fix:
// TODO: Add type annotation
      const newZoom = Math.max(prev - 0.25, 0.25);
```

- Line 60: Missing type annotation
```typescript
// Original:
  const handleRotateLeft = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleRotateLeft = () => {
```

- Line 62: Missing type annotation
```typescript
// Original:
      const newRotation = (prev - 90) % 360;

// Suggested Fix:
// TODO: Add type annotation
      const newRotation = (prev - 90) % 360;
```

- Line 68: Missing type annotation
```typescript
// Original:
  const handleRotateRight = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleRotateRight = () => {
```

- Line 70: Missing type annotation
```typescript
// Original:
      const newRotation = (prev + 90) % 360;

// Suggested Fix:
// TODO: Add type annotation
      const newRotation = (prev + 90) % 360;
```

- Line 76: Missing type annotation
```typescript
// Original:
  const handleReset = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleReset = () => {
```

- Line 105: Missing type annotation
```typescript
// Original:
  const fileType = getFileType(file.name) as FileType;

// Suggested Fix:
// TODO: Add type annotation
  const fileType = getFileType(file.name) as FileType;
```

- Line 106: Missing type annotation
```typescript
// Original:
  const isImage = fileType.startsWith('image/');

// Suggested Fix:
// TODO: Add type annotation
  const isImage = fileType.startsWith('image/');
```

- Line 107: Missing type annotation
```typescript
// Original:
  const isPDF = fileType === 'application/pdf';

// Suggested Fix:
// TODO: Add type annotation
  const isPDF = fileType === 'application/pdf';
```

- Line 108: Missing type annotation
```typescript
// Original:
  const isText = fileType.startsWith('text/') || fileType === 'application/json';

// Suggested Fix:
// TODO: Add type annotation
  const isText = fileType.startsWith('text/') || fileType === 'application/json';
```

- Line 109: Missing type annotation
```typescript
// Original:
  const isMedia = fileType.startsWith('video/') || fileType.startsWith('audio/');

// Suggested Fix:
// TODO: Add type annotation
  const isMedia = fileType.startsWith('video/') || fileType.startsWith('audio/');
```

- Line 111: Missing type annotation
```typescript
// Original:
  const renderPreview = () => {

// Suggested Fix:
// TODO: Add type annotation
  const renderPreview = () => {
```

### src\client\components\FileToolbar.tsx

- Line 79: Missing type annotation
```typescript
// Original:
  const handleSortClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSortClose = () => {
```

### src\client\components\FloatingChatButton.tsx

- Line 16: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 19: Missing type annotation
```typescript
// Original:
  const handleOpen = () => setOpen(true);

// Suggested Fix:
// TODO: Add type annotation
  const handleOpen = () => setOpen(true);
```

- Line 20: Missing type annotation
```typescript
// Original:
  const handleClose = () => setOpen(false);

// Suggested Fix:
// TODO: Add type annotation
  const handleClose = () => setOpen(false);
```

### src\client\components\HostManager.tsx

- Line 27: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 63: Missing type annotation
```typescript
// Original:
  const networkData = [

// Suggested Fix:
// TODO: Add type annotation
  const networkData = [
```

- Line 71: Missing type annotation
```typescript
// Original:
  const connectionData = [

// Suggested Fix:
// TODO: Add type annotation
  const connectionData = [
```

- Line 79: Missing type annotation
```typescript
// Original:
  const speedData = [

// Suggested Fix:
// TODO: Add type annotation
  const speedData = [
```

### src\client\components\HostSelector.tsx

- Line 40: Function parameter missing type
```typescript
// Original:
export function HostSelector({ open, onClose, onSelect, onAdd }: Props): JSX.Element {

// Suggested Fix:
// TODO: Add parameter type
export function HostSelector({ open, onClose, onSelect, onAdd }: Props): JSX.Element {
```

- Line 40: Function parameter missing type
```typescript
// Original:
export function HostSelector({ open, onClose, onSelect, onAdd }: Props): JSX.Element {

// Suggested Fix:
// TODO: Add parameter type
export function HostSelector({ open, onClose, onSelect, onAdd }: Props): JSX.Element {
```

- Line 40: Function parameter missing type
```typescript
// Original:
export function HostSelector({ open, onClose, onSelect, onAdd }: Props): JSX.Element {

// Suggested Fix:
// TODO: Add parameter type
export function HostSelector({ open, onClose, onSelect, onAdd }: Props): JSX.Element {
```

- Line 41: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 48: Missing type annotation
```typescript
// Original:
  const loadHosts = useCallback(async () => {

// Suggested Fix:
// TODO: Add type annotation
  const loadHosts = useCallback(async () => {
```

- Line 52: Missing type annotation
```typescript
// Original:
      const data = await listHosts();

// Suggested Fix:
// TODO: Add type annotation
      const data = await listHosts();
```

- Line 67: Missing type annotation
```typescript
// Original:
  const handleSelect = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSelect = () => {
```

- Line 74: Missing type annotation
```typescript
// Original:
  const filteredHosts = hosts.filter(

// Suggested Fix:
// TODO: Add type annotation
  const filteredHosts = hosts.filter(
```

### src\client\components\ImagePreview.tsx

- Line 14: Function parameter missing type
```typescript
// Original:
export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {
```

- Line 14: Function parameter missing type
```typescript
// Original:
export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {
```

- Line 14: Function parameter missing type
```typescript
// Original:
export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {
```

- Line 14: Function parameter missing type
```typescript
// Original:
export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {
```

- Line 17: Missing type annotation
```typescript
// Original:
  const handleLoad = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleLoad = () => {
```

- Line 25: Missing type annotation
```typescript
// Original:
  const handleError = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleError = () => {
```

- Line 38: Missing type annotation
```typescript
// Original:
  const imageUrl = `/api/files/${hostId}/content${file.path}`;

// Suggested Fix:
// TODO: Add type annotation
  const imageUrl = `/api/files/${hostId}/content${file.path}`;
```

### src\client\components\Layout.tsx

- Line 29: Missing type annotation
```typescript
// Original:
const DRAWER_WIDTH = 240;

// Suggested Fix:
// TODO: Add type annotation
const DRAWER_WIDTH = 240;
```

- Line 35: Missing type annotation
```typescript
// Original:
const Search = styled('div')(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const Search = styled('div')(({ theme }) => ({
```

- Line 51: Missing type annotation
```typescript
// Original:
const SearchIconWrapper = styled('div')(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const SearchIconWrapper = styled('div')(({ theme }) => ({
```

- Line 61: Missing type annotation
```typescript
// Original:
const StyledInputBase = styled(InputBase)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledInputBase = styled(InputBase)(({ theme }) => ({
```

- Line 75: Missing type annotation
```typescript
// Original:
  const location = useLocation();

// Suggested Fix:
// TODO: Add type annotation
  const location = useLocation();
```

- Line 76: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 80: Missing type annotation
```typescript
// Original:
  const handleDrawerToggle = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleDrawerToggle = () => {
```

### src\client\components\LoadingIndicator.tsx

- Line 19: Missing type annotation
```typescript
// Original:
  const operations = Object.entries(loadingStates);

// Suggested Fix:
// TODO: Add type annotation
  const operations = Object.entries(loadingStates);
```

### src\client\components\LoadingScreen.tsx

- Line 30: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 35: Missing type annotation
```typescript
// Original:
      const timer = setTimeout(() => setShow(true), delay);

// Suggested Fix:
// TODO: Add type annotation
      const timer = setTimeout(() => setShow(true), delay);
```

- Line 44: Missing type annotation
```typescript
// Original:
  const content = (

// Suggested Fix:
// TODO: Add type annotation
  const content = (
```

### src\client\components\Login.tsx

- Line 32: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 33: Missing type annotation
```typescript
// Original:
  const navigate = useNavigate();

// Suggested Fix:
// TODO: Add type annotation
  const navigate = useNavigate();
```

### src\client\components\LogViewer.tsx

- Line 35: Missing type annotation
```typescript
// Original:
const ROW_HEIGHT = 60;

// Suggested Fix:
// TODO: Add type annotation
const ROW_HEIGHT = 60;
```

- Line 48: Missing type annotation
```typescript
// Original:
  const log = data.logs[index];

// Suggested Fix:
// TODO: Add type annotation
  const log = data.logs[index];
```

- Line 61: Function parameter missing type
```typescript
// Original:
function LogViewerContent({ hostIds, maxLogs }: LogViewerProps) {

// Suggested Fix:
// TODO: Add parameter type
function LogViewerContent({ hostIds, maxLogs }: LogViewerProps) {
```

- Line 62: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 66: Missing type annotation
```typescript
// Original:
  const listRef = React.useRef<List | null>(null);

// Suggested Fix:
// TODO: Add type annotation
  const listRef = React.useRef<List | null>(null);
```

- Line 111: Missing type annotation
```typescript
// Original:
  const handleRefresh = useCallback(() => {

// Suggested Fix:
// TODO: Add type annotation
  const handleRefresh = useCallback(() => {
```

### src\client\components\MediaPreview.tsx

- Line 12: Function parameter missing type
```typescript
// Original:
export function MediaPreview({ file, hostId, onError }: MediaPreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function MediaPreview({ file, hostId, onError }: MediaPreviewProps) {
```

- Line 12: Function parameter missing type
```typescript
// Original:
export function MediaPreview({ file, hostId, onError }: MediaPreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function MediaPreview({ file, hostId, onError }: MediaPreviewProps) {
```

- Line 14: Missing type annotation
```typescript
// Original:
  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement>(null);

// Suggested Fix:
// TODO: Add type annotation
  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement>(null);
```

- Line 16: Missing type annotation
```typescript
// Original:
  const handleLoad = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleLoad = () => {
```

- Line 25: Missing type annotation
```typescript
// Original:
  const handleError = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleError = () => {
```

- Line 39: Missing type annotation
```typescript
// Original:
  const mediaUrl = `/api/files/${hostId}/content${file.path}`;

// Suggested Fix:
// TODO: Add type annotation
  const mediaUrl = `/api/files/${hostId}/content${file.path}`;
```

- Line 40: Missing type annotation
```typescript
// Original:
  const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.webm');

// Suggested Fix:
// TODO: Add type annotation
  const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.webm');
```

### src\client\components\MetricsDisplay.tsx

- Line 56: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 65: Missing type annotation
```typescript
// Original:
  const cpuData = history.map(m => ({

// Suggested Fix:
// TODO: Add type annotation
  const cpuData = history.map(m => ({
```

- Line 72: Missing type annotation
```typescript
// Original:
  const memoryData = history.map(m => ({

// Suggested Fix:
// TODO: Add type annotation
  const memoryData = history.map(m => ({
```

- Line 80: Missing type annotation
```typescript
// Original:
  const networkData = history.map(m => ({

// Suggested Fix:
// TODO: Add type annotation
  const networkData = history.map(m => ({
```

- Line 86: Missing type annotation
```typescript
// Original:
  const diskData = history.map(m => ({

// Suggested Fix:
// TODO: Add type annotation
  const diskData = history.map(m => ({
```

### src\client\components\Navigation.tsx

- Line 109: Missing type annotation
```typescript
// Original:
  const location = useLocation();

// Suggested Fix:
// TODO: Add type annotation
  const location = useLocation();
```

- Line 110: Missing type annotation
```typescript
// Original:
  const navigate = useNavigate();

// Suggested Fix:
// TODO: Add type annotation
  const navigate = useNavigate();
```

- Line 111: Missing type annotation
```typescript
// Original:
  const theme = useMuiTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useMuiTheme();
```

- Line 127: Missing type annotation
```typescript
// Original:
    const isSelected = location.pathname === item.path;

// Suggested Fix:
// TODO: Add type annotation
    const isSelected = location.pathname === item.path;
```

- Line 128: Missing type annotation
```typescript
// Original:
    const hasSubItems = item.subItems && item.subItems.length > 0;

// Suggested Fix:
// TODO: Add type annotation
    const hasSubItems = item.subItems && item.subItems.length > 0;
```

- Line 129: Missing type annotation
```typescript
// Original:
    const isOpen = openItems[item.label] || false;

// Suggested Fix:
// TODO: Add type annotation
    const isOpen = openItems[item.label] || false;
```

### src\client\components\NetworkAnalytics.tsx

- Line 59: Missing type annotation
```typescript
// Original:
  const networkData = [

// Suggested Fix:
// TODO: Add type annotation
  const networkData = [
```

### src\client\components\NotificationBell.tsx

- Line 71: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 93: Missing type annotation
```typescript
// Original:
  const handlePermissionRequest = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handlePermissionRequest = async () => {
```

- Line 94: Missing type annotation
```typescript
// Original:
    const granted = await requestPermission();

// Suggested Fix:
// TODO: Add type annotation
    const granted = await requestPermission();
```

- Line 141: Missing type annotation
```typescript
// Original:
  const handleMarkAllAsRead = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleMarkAllAsRead = async () => {
```

- Line 149: Missing type annotation
```typescript
// Original:
  const handleClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleClose = () => {
```

- Line 153: Missing type annotation
```typescript
// Original:
  const open = Boolean(anchorEl);

// Suggested Fix:
// TODO: Add type annotation
  const open = Boolean(anchorEl);
```

### src\client\components\NotificationSettings.tsx

- Line 105: Missing type annotation
```typescript
// Original:
      const isEnabled = preferences[`${channel}Enabled`];

// Suggested Fix:
// TODO: Add type annotation
      const isEnabled = preferences[`${channel}Enabled`];
```

- Line 125: Missing type annotation
```typescript
// Original:
        const isEnabled = preferences[`${channel}Enabled`];

// Suggested Fix:
// TODO: Add type annotation
        const isEnabled = preferences[`${channel}Enabled`];
```

- Line 127: Missing type annotation
```typescript
// Original:
          const currentTypes = preferences[channel];

// Suggested Fix:
// TODO: Add type annotation
          const currentTypes = preferences[channel];
```

- Line 128: Missing type annotation
```typescript
// Original:
          const hasType = currentTypes.includes(eventType);

// Suggested Fix:
// TODO: Add type annotation
          const hasType = currentTypes.includes(eventType);
```

- Line 129: Missing type annotation
```typescript
// Original:
          const updatedTypes = hasType

// Suggested Fix:
// TODO: Add type annotation
          const updatedTypes = hasType
```

### src\client\components\OpenWithMenu.tsx

- Line 23: Function parameter missing type
```typescript
// Original:
export function OpenWithMenu({ file, anchorEl, onClose, hostId }: OpenWithMenuProps) {

// Suggested Fix:
// TODO: Add parameter type
export function OpenWithMenu({ file, anchorEl, onClose, hostId }: OpenWithMenuProps) {
```

- Line 23: Function parameter missing type
```typescript
// Original:
export function OpenWithMenu({ file, anchorEl, onClose, hostId }: OpenWithMenuProps) {

// Suggested Fix:
// TODO: Add parameter type
export function OpenWithMenu({ file, anchorEl, onClose, hostId }: OpenWithMenuProps) {
```

- Line 23: Function parameter missing type
```typescript
// Original:
export function OpenWithMenu({ file, anchorEl, onClose, hostId }: OpenWithMenuProps) {

// Suggested Fix:
// TODO: Add parameter type
export function OpenWithMenu({ file, anchorEl, onClose, hostId }: OpenWithMenuProps) {
```

- Line 24: Missing type annotation
```typescript
// Original:
  const handleOpenInCodeServer = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleOpenInCodeServer = async () => {
```

- Line 33: Missing type annotation
```typescript
// Original:
  const handleOpenInSystemDefault = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleOpenInSystemDefault = async () => {
```

- Line 37: Missing type annotation
```typescript
// Original:
      const response = await fetch(`/api/hosts/${hostId}/files/open`, {

// Suggested Fix:
// TODO: Add type annotation
      const response = await fetch(`/api/hosts/${hostId}/files/open`, {
```

### src\client\components\PackageManager.tsx

- Line 45: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 54: Missing type annotation
```typescript
// Original:
  const loadPackages = useCallback(async () => {

// Suggested Fix:
// TODO: Add type annotation
  const loadPackages = useCallback(async () => {
```

- Line 63: Missing type annotation
```typescript
// Original:
      const data = await listPackages(hostId);

// Suggested Fix:
// TODO: Add type annotation
      const data = await listPackages(hostId);
```

- Line 72: Missing type annotation
```typescript
// Original:
  const handleInstall = useCallback(async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleInstall = useCallback(async () => {
```

- Line 118: Missing type annotation
```typescript
// Original:
  const handleSearch = useCallback(async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSearch = useCallback(async () => {
```

- Line 127: Missing type annotation
```typescript
// Original:
      const data = await searchPackages(hostId, searchQuery);

// Suggested Fix:
// TODO: Add type annotation
      const data = await searchPackages(hostId, searchQuery);
```

### src\client\components\PDFPreview.tsx

- Line 18: Function parameter missing type
```typescript
// Original:
export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {
```

- Line 18: Function parameter missing type
```typescript
// Original:
export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {
```

- Line 18: Function parameter missing type
```typescript
// Original:
export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {
```

- Line 18: Function parameter missing type
```typescript
// Original:
export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {
```

- Line 44: Missing type annotation
```typescript
// Original:
  const pdfUrl = `/api/files/${hostId}/content${file.path}`;

// Suggested Fix:
// TODO: Add type annotation
  const pdfUrl = `/api/files/${hostId}/content${file.path}`;
```

### src\client\components\PrivateRoute.tsx

- Line 11: Function parameter missing type
```typescript
// Original:
export function PrivateRoute({ children, requireAdmin = false }: PrivateRouteProps): JSX.Element {

// Suggested Fix:
// TODO: Add parameter type
export function PrivateRoute({ children, requireAdmin = false }: PrivateRouteProps): JSX.Element {
```

- Line 13: Missing type annotation
```typescript
// Original:
  const location = useLocation();

// Suggested Fix:
// TODO: Add type annotation
  const location = useLocation();
```

### src\client\components\ProcessLimits.tsx

- Line 10: Function parameter missing type
```typescript
// Original:
export function ProcessLimits({ config, onConfigChange, onApplyLimits }: ProcessLimitsProps) {

// Suggested Fix:
// TODO: Add parameter type
export function ProcessLimits({ config, onConfigChange, onApplyLimits }: ProcessLimitsProps) {
```

- Line 10: Function parameter missing type
```typescript
// Original:
export function ProcessLimits({ config, onConfigChange, onApplyLimits }: ProcessLimitsProps) {

// Suggested Fix:
// TODO: Add parameter type
export function ProcessLimits({ config, onConfigChange, onApplyLimits }: ProcessLimitsProps) {
```

- Line 41: Missing type annotation
```typescript
// Original:
  const renderLimitControls = (

// Suggested Fix:
// TODO: Add type annotation
  const renderLimitControls = (
```

### src\client\components\ProcessList.tsx

- Line 57: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 68: Missing type annotation
```typescript
// Original:
    const isAsc = orderBy === property && order === 'asc';

// Suggested Fix:
// TODO: Add type annotation
    const isAsc = orderBy === property && order === 'asc';
```

- Line 92: Missing type annotation
```typescript
// Original:
  const handleMenuClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleMenuClose = () => {
```

- Line 121: Missing type annotation
```typescript
// Original:
  const filteredProcesses = processes.filter((process) =>

// Suggested Fix:
// TODO: Add type annotation
  const filteredProcesses = processes.filter((process) =>
```

- Line 125: Missing type annotation
```typescript
// Original:
  const sortedProcesses = filteredProcesses.sort((a, b) => {

// Suggested Fix:
// TODO: Add type annotation
  const sortedProcesses = filteredProcesses.sort((a, b) => {
```

- Line 126: Missing type annotation
```typescript
// Original:
    const isAsc = order === 'asc';

// Suggested Fix:
// TODO: Add type annotation
    const isAsc = order === 'asc';
```

- Line 145: Missing type annotation
```typescript
// Original:
  const paginatedProcesses = sortedProcesses.slice(

// Suggested Fix:
// TODO: Add type annotation
  const paginatedProcesses = sortedProcesses.slice(
```

### src\client\components\ProcessMonitor.tsx

- Line 21: Missing type annotation
```typescript
// Original:
  const socket = useSocket();

// Suggested Fix:
// TODO: Add type annotation
  const socket = useSocket();
```

### src\client\components\RemoteExecution.tsx

- Line 66: Missing type annotation
```typescript
// Original:
      const response = await executeCommand(selectedHost.id, cmd);

// Suggested Fix:
// TODO: Add type annotation
      const response = await executeCommand(selectedHost.id, cmd);
```

- Line 82: Missing type annotation
```typescript
// Original:
  const handleClear = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleClear = () => {
```

### src\client\components\settings\AdminSettings.tsx

- Line 20: Missing type annotation
```typescript
// Original:
const StyledPaper = styled(Paper)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledPaper = styled(Paper)(({ theme }) => ({
```

- Line 25: Missing type annotation
```typescript
// Original:
const StyledFormControl = styled(FormControl)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledFormControl = styled(FormControl)(({ theme }) => ({
```

- Line 30: Missing type annotation
```typescript
// Original:
const StyledTypography = styled(Typography)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledTypography = styled(Typography)(({ theme }) => ({
```

- Line 71: Missing type annotation
```typescript
// Original:
    const value = event.target.type === 'checkbox'

// Suggested Fix:
// TODO: Add type annotation
    const value = event.target.type === 'checkbox'
```

- Line 80: Missing type annotation
```typescript
// Original:
  const handleSave = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSave = async () => {
```

### src\client\components\settings\UserSettings.tsx

- Line 20: Missing type annotation
```typescript
// Original:
const StyledPaper = styled(Paper)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledPaper = styled(Paper)(({ theme }) => ({
```

- Line 25: Missing type annotation
```typescript
// Original:
const StyledFormControl = styled(FormControl)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledFormControl = styled(FormControl)(({ theme }) => ({
```

- Line 30: Missing type annotation
```typescript
// Original:
const StyledTypography = styled(Typography)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledTypography = styled(Typography)(({ theme }) => ({
```

- Line 58: Missing type annotation
```typescript
// Original:
    const value = event.target.type === 'checkbox'

// Suggested Fix:
// TODO: Add type annotation
    const value = event.target.type === 'checkbox'
```

- Line 67: Missing type annotation
```typescript
// Original:
  const handleSave = async () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleSave = async () => {
```

### src\client\components\SettingsPage.tsx

- Line 25: Missing type annotation
```typescript
// Original:
const StyledContainer = styled(Container)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledContainer = styled(Container)(({ theme }) => ({
```

- Line 32: Missing type annotation
```typescript
// Original:
const StyledPaper = styled(Paper)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledPaper = styled(Paper)(({ theme }) => ({
```

- Line 37: Missing type annotation
```typescript
// Original:
const StyledTabs = styled(Tabs)(({ theme }) => ({

// Suggested Fix:
// TODO: Add type annotation
const StyledTabs = styled(Tabs)(({ theme }) => ({
```

- Line 73: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

### src\client\components\SetupWizard.tsx

- Line 96: Missing type annotation
```typescript
// Original:
  const navigate = useNavigate();

// Suggested Fix:
// TODO: Add type annotation
  const navigate = useNavigate();
```

- Line 122: Missing type annotation
```typescript
// Original:
      const portValue = parseInt(event.target.value, 10);

// Suggested Fix:
// TODO: Add type annotation
      const portValue = parseInt(event.target.value, 10);
```

- Line 194: Missing type annotation
```typescript
// Original:
      const createResponse = await api.post<ApiResponse<Host>>('/api/hosts', {

// Suggested Fix:
// TODO: Add type annotation
      const createResponse = await api.post<ApiResponse<Host>>('/api/hosts', {
```

- Line 201: Missing type annotation
```typescript
// Original:
        const host = createResponse.data.data;

// Suggested Fix:
// TODO: Add type annotation
        const host = createResponse.data.data;
```

- Line 204: Missing type annotation
```typescript
// Original:
        const installResponse = await api.post<ApiResponse<void>>(`/api/hosts/${host.id}/install`, {

// Suggested Fix:
// TODO: Add type annotation
        const installResponse = await api.post<ApiResponse<void>>(`/api/hosts/${host.id}/install`, {
```

- Line 242: Missing type annotation
```typescript
// Original:
  const toggleHelp = useCallback(() => {

// Suggested Fix:
// TODO: Add type annotation
  const toggleHelp = useCallback(() => {
```

### src\client\components\StorageManager.tsx

- Line 30: Missing type annotation
```typescript
// Original:
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Suggested Fix:
// TODO: Add type annotation
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
```

### src\client\components\SystemHealth.tsx

- Line 43: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 47: Missing type annotation
```typescript
// Original:
  const handleRefresh = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleRefresh = () => {
```

### src\client\components\Terminal.tsx

- Line 14: Missing type annotation
```typescript
// Original:
const importFitAddon = () => import('@xterm/addon-fit').then(m => m.FitAddon);

// Suggested Fix:
// TODO: Add type annotation
const importFitAddon = () => import('@xterm/addon-fit').then(m => m.FitAddon);
```

- Line 15: Missing type annotation
```typescript
// Original:
const importWebLinksAddon = () => import('@xterm/addon-web-links').then(m => m.WebLinksAddon);

// Suggested Fix:
// TODO: Add type annotation
const importWebLinksAddon = () => import('@xterm/addon-web-links').then(m => m.WebLinksAddon);
```

- Line 16: Missing type annotation
```typescript
// Original:
const importSearchAddon = () => import('@xterm/addon-search').then(m => m.SearchAddon);

// Suggested Fix:
// TODO: Add type annotation
const importSearchAddon = () => import('@xterm/addon-search').then(m => m.SearchAddon);
```

- Line 35: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 36: Missing type annotation
```typescript
// Original:
  const socket = useSocket();

// Suggested Fix:
// TODO: Add type annotation
  const socket = useSocket();
```

- Line 37: Missing type annotation
```typescript
// Original:
  const terminalRef = useRef<HTMLDivElement>(null);

// Suggested Fix:
// TODO: Add type annotation
  const terminalRef = useRef<HTMLDivElement>(null);
```

- Line 38: Missing type annotation
```typescript
// Original:
  const xtermRef = useRef<XTerm | null>(null);

// Suggested Fix:
// TODO: Add type annotation
  const xtermRef = useRef<XTerm | null>(null);
```

- Line 39: Missing type annotation
```typescript
// Original:
  const fitAddonRef = useRef<FitAddon | null>(null);

// Suggested Fix:
// TODO: Add type annotation
  const fitAddonRef = useRef<FitAddon | null>(null);
```

- Line 40: Missing type annotation
```typescript
// Original:
  const resizeHandlerRef = useRef<(() => void) | null>(null);

// Suggested Fix:
// TODO: Add type annotation
  const resizeHandlerRef = useRef<(() => void) | null>(null);
```

- Line 45: Missing type annotation
```typescript
// Original:
    const xterm = new XTerm({

// Suggested Fix:
// TODO: Add type annotation
    const xterm = new XTerm({
```

- Line 67: Missing type annotation
```typescript
// Original:
      const fitAddon = new FitAddon();

// Suggested Fix:
// TODO: Add type annotation
      const fitAddon = new FitAddon();
```

- Line 85: Missing type annotation
```typescript
// Original:
      const handleResize = () => {

// Suggested Fix:
// TODO: Add type annotation
      const handleResize = () => {
```

### src\client\components\TextPreview.tsx

- Line 12: Function parameter missing type
```typescript
// Original:
export function TextPreview({ file, hostId, onError }: TextPreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function TextPreview({ file, hostId, onError }: TextPreviewProps) {
```

- Line 12: Function parameter missing type
```typescript
// Original:
export function TextPreview({ file, hostId, onError }: TextPreviewProps) {

// Suggested Fix:
// TODO: Add parameter type
export function TextPreview({ file, hostId, onError }: TextPreviewProps) {
```

- Line 17: Missing type annotation
```typescript
// Original:
    const fetchContent = async () => {

// Suggested Fix:
// TODO: Add type annotation
    const fetchContent = async () => {
```

- Line 25: Missing type annotation
```typescript
// Original:
        const response = await fetch(`/api/files/${hostId}/content${file.path}`);

// Suggested Fix:
// TODO: Add type annotation
        const response = await fetch(`/api/files/${hostId}/content${file.path}`);
```

- Line 29: Missing type annotation
```typescript
// Original:
        const text = await response.text();

// Suggested Fix:
// TODO: Add type annotation
        const text = await response.text();
```

### src\client\components\ThemeControls.tsx

- Line 27: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 35: Missing type annotation
```typescript
// Original:
  const handleClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleClose = () => {
```

- Line 44: Missing type annotation
```typescript
// Original:
  const getThemeIcon = () => {

// Suggested Fix:
// TODO: Add type annotation
  const getThemeIcon = () => {
```

- Line 55: Missing type annotation
```typescript
// Original:
  const menuItems = [

// Suggested Fix:
// TODO: Add type annotation
  const menuItems = [
```

### src\client\components\ThemeToggle.tsx

- Line 22: Missing type annotation
```typescript
// Original:
  const muiTheme = useMuiTheme();

// Suggested Fix:
// TODO: Add type annotation
  const muiTheme = useMuiTheme();
```

- Line 29: Missing type annotation
```typescript
// Original:
  const handleClose = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleClose = () => {
```

- Line 43: Missing type annotation
```typescript
// Original:
  const getCurrentIcon = () => {

// Suggested Fix:
// TODO: Add type annotation
  const getCurrentIcon = () => {
```

### src\client\components\UserProfile.tsx

- Line 34: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 100: Missing type annotation
```typescript
// Original:
  const handleCancel = () => {

// Suggested Fix:
// TODO: Add type annotation
  const handleCancel = () => {
```

### src\client\components\WelcomeCard.tsx

- Line 27: Function parameter missing type
```typescript
// Original:
export function WelcomeCard({ username, onGetStarted }: WelcomeCardProps): JSX.Element {

// Suggested Fix:
// TODO: Add parameter type
export function WelcomeCard({ username, onGetStarted }: WelcomeCardProps): JSX.Element {
```

- Line 28: Missing type annotation
```typescript
// Original:
  const theme = useTheme();

// Suggested Fix:
// TODO: Add type annotation
  const theme = useTheme();
```

- Line 30: Missing type annotation
```typescript
// Original:
  const features = [

// Suggested Fix:
// TODO: Add type annotation
  const features = [
```

