# Cascade Implementation Guide - DTO Migration Project

## Overview
As Cascade, I will extend and standardize the existing DTO infrastructure using my capabilities:
- Code analysis and search
- File modification
- Command execution
- Progress tracking

## Current Implementation Analysis

### 1. Base DTOs
```typescript
// Core Base DTOs
- BaseEntityDto
- BaseResponseDto
- BaseErrorDto
- PaginatedResponseDto

// Specialized Base DTOs
- BaseAuditDto
- BaseConfigDto
- BaseHealthDto
- BaseMetricsDto
- BaseNotificationDto
- BasePermissionDto
- BaseSearchDto
- BaseTimeRangeDto
- BaseValidationDto
```

### 2. Validation Infrastructure
```typescript
// Custom Decorators
- @IsValidTenantId()
- @IsValidMetadata()
- @IsValidTags()
- @IsValidVersion()

// Validation Pipe
- DtoValidationPipe
- ValidationConfig
```

### 3. Error Handling
```typescript
// Error Types
- ValidationError
- BusinessError
- SystemError

// Error Response
- code: string
- category: string
- message: string
- severity: ErrorSeverity
- details?: Record<string, unknown>
```

## Implementation Process

### Phase 1: Discovery & Analysis
1. **Find All DTOs**
   ```typescript
   // Execute these searches in order:
   search1: files containing "dto" (case-insensitive)
   search2: files containing "class *Dto"
   search3: files containing "interface *Dto"
   search4: files containing "@ApiProperty"
   
   // For each file found:
   - Document full path
   - Note if it's a class/interface
   - List what it extends/implements
   - Document all properties and their types
   ```

2. **Analyze DTO Hierarchy**
   ```typescript
   // Create a tree showing inheritance:
   BaseEntityDto
   ├── UserDto
   │   └── AdminUserDto
   ├── ProductDto
   └── ...

   // For each DTO document:
   - What base DTO it extends
   - What interfaces it implements
   - What other DTOs depend on it
   ```

3. **Document Current Patterns**
   ```typescript
   // For each pattern found, record:
   {
     pattern: string,          // e.g., "@IsValidTenantId"
     frequency: number,        // How many times used
     locations: string[],      // Files where found
     context: string,         // How it's being used
     standardCompliance: bool  // Matches our standards?
   }
   ```

### Phase 2: Planning
1. **Create Migration Map**
   ```typescript
   // For each DTO, determine:
   {
     dtoName: string,
     currentLocation: string,
     targetLocation: string,
     requiredChanges: {
       properties: string[],    // Props to add/modify
       decorators: string[],    // Decorators to add/update
       imports: string[],       // New imports needed
       tests: string[]         // Test cases to add
     },
     dependencies: string[],    // DTOs that must be migrated first
     priority: number          // 1 (highest) to 3 (lowest)
   }
   ```

2. **Define Test Strategy**
   ```typescript
   // For each DTO, create:
   {
     testFile: string,         // Test file location
     testCases: {
       validation: string[],    // Validation scenarios
       transformation: string[], // Transform scenarios
       integration: string[]    // Integration points
     },
     mockData: {
       valid: object[],        // Valid test data
       invalid: object[]       // Invalid test data
     }
   }
   ```

### Phase 3: Implementation
1. **Base DTO Updates**
   ```typescript
   // Order of implementation:
   1. Core base DTOs
   2. Validation decorators
   3. Error handling
   4. Test infrastructure
   
   // For each change:
   - Show proposed changes
   - Get approval
   - Make changes
   - Run tests
   - Document results
   ```

2. **Migration Execution**
   ```typescript
   // For each DTO in priority order:
   1. Create new file if needed
   2. Update imports
   3. Add/update properties
   4. Add/update decorators
   5. Add/update tests
   6. Verify changes
   7. Update progress tracker
   ```

## Progress Tracking
```typescript
// Update this after each DTO:
const progress = {
  phase: string,              // Current phase
  completedDtos: {
    name: string,
    status: 'completed' | 'in-progress' | 'pending',
    testStatus: 'passed' | 'failed' | 'pending',
    issues: string[]
  }[],
  metrics: {
    totalDtos: number,
    completed: number,
    testCoverage: number,
    issuesFound: number,
    issuesResolved: number
  },
  nextActions: string[]
};
```

## Quality Checks
Run these checks after each DTO migration:
```bash
# 1. Type Check
npm run type-check

# 2. Tests
npm run test
npm run test:coverage

# 3. Linting
npm run lint

# 4. Build Verification
npm run build
```

Report results after each check. Stop and fix if any check fails.

## Quality Standards
1. Type Safety
   - Strict TypeScript
   - No any types
   - Full type coverage

2. Performance
   - Fast validation
   - Efficient transforms
   - Small memory footprint

3. Testing
   - Full coverage
   - Edge cases
   - Performance tests

## Tool Usage

### Code Analysis
```typescript
// Search patterns
- "class *Dto"
- "@ApiProperty"
- "extends Base*Dto"
- "@IsValid*"
```

### File Operations
- Analyze before changes
- Make atomic edits
- Verify after changes
- Track dependencies

### Command Execution
```bash
# Verification
npm run type-check
npm run test
npm run lint

# Performance
npm run perf:build
npm run perf:bench
```

## Directory Structure
```
src/
├── shared/
│   ├── dtos/
│   │   ├── base/
│   │   │   ├── index.ts
│   │   │   ├── base-entity.dto.ts
│   │   │   ├── base-response.dto.ts
│   │   │   └── base-error.dto.ts
│   │   ├── specialized/
│   │   │   ├── index.ts
│   │   │   ├── auditable.dto.ts
│   │   │   ├── versioned.dto.ts
│   │   │   └── taggable.dto.ts
│   │   ├── validation/
│   │   │   ├── index.ts
│   │   │   ├── validators/
│   │   │   └── decorators/
│   │   └── types/
│   │       ├── index.ts
│   │       ├── metadata.ts
│   │       └── validation.ts
│   └── utils/
│       ├── index.ts
│       └── validation.utils.ts
└── tests/
    └── dtos/
        ├── base/
        ├── specialized/
        └── validation/
```

## Implementation Order
1. Core Types
   - Metadata interfaces
   - Validation types
   - Utility types

2. Base DTOs
   - Enhanced BaseEntityDto
   - Type-safe BaseResponseDto
   - Structured BaseErrorDto

3. Specialized DTOs
   - AuditableEntityDto
   - VersionedEntityDto
   - TaggableEntityDto

4. Validation
   - Custom validators
   - Enhanced decorators
   - Validation utilities

## Metadata Type System
```typescript
// src/shared/dtos/types/metadata.ts
export type MetadataValueType = 
  | string 
  | number 
  | boolean 
  | object;

export interface IMetadata<T extends MetadataValueType = any> {
  key: string;
  value: T;
  description?: string;
  tags?: string[];
  timestamp?: string;
}

export class Metadata<T extends MetadataValueType> implements IMetadata<T> {
  constructor(data: IMetadata<T>) {
    Object.assign(this, data);
    this.timestamp = this.timestamp || new Date().toISOString();
  }

  static isValid<T extends MetadataValueType>(
    metadata: unknown
  ): metadata is IMetadata<T> {
    if (!metadata || typeof metadata !== 'object') return false;
    const m = metadata as IMetadata<T>;
    return (
      typeof m.key === 'string' &&
      m.value !== undefined &&
      (!m.tags || Array.isArray(m.tags))
    );
  }
}
```

## Enhanced Base DTOs
```typescript
// src/shared/dtos/base/base-entity.dto.ts
export class BaseEntityDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  tenantId: string;

  @ApiProperty({ type: () => [Metadata] })
  @ValidateNested({ each: true })
  @Type(() => Metadata)
  @IsOptional()
  metadata?: Metadata[];

  constructor(partial: Partial<BaseEntityDto>) {
    Object.assign(this, partial);
    if (partial.metadata) {
      this.metadata = partial.metadata.map(m => new Metadata(m));
    }
  }
}
```

## Custom Validators
```typescript
// src/shared/dtos/validation/validators/metadata.validator.ts
@ValidatorConstraint({ async: true })
export class MetadataValidator implements ValidatorConstraintInterface {
  async validate(metadata: IMetadata[]): Promise<boolean> {
    if (!Array.isArray(metadata)) return false;
    
    return metadata.every(item => Metadata.isValid(item));
  }

  defaultMessage(): string {
    return 'Invalid metadata structure';
  }
}

// src/shared/dtos/validation/decorators/is-valid-metadata.decorator.ts
export function IsValidMetadata(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidMetadata',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: MetadataValidator,
    });
  };
}
```

## Test Structure
```
tests/
├── dtos/
│   ├── base/
│   │   ├── base-entity.spec.ts
│   │   ├── base-response.spec.ts
│   │   └── base-error.spec.ts
│   ├── specialized/
│   │   ├── auditable.spec.ts
│   │   ├── versioned.spec.ts
│   │   └── taggable.spec.ts
│   └── validation/
│       ├── metadata.validator.spec.ts
│       └── decorators.spec.ts
└── utils/
    └── validation.utils.spec.ts
```

## Test Implementation
```typescript
// tests/dtos/base/base-entity.spec.ts
describe('BaseEntityDto', () => {
  describe('Type Safety', () => {
    it('should enforce metadata type safety', () => {
      const dto = new BaseEntityDto({
        metadata: [{
          key: 'number',
          value: 123
        }]
      });

      // @ts-expect-error - Type 'string' is not assignable to type 'number'
      dto.metadata[0].value = 'string';
    });
  });

  describe('Validation', () => {
    it('should validate metadata structure', async () => {
      const dto = new BaseEntityDto({
        metadata: [{
          key: 'test',
          value: 123,
          invalidField: true // Should fail validation
        }]
      });

      const errors = await validate(dto);
      expect(errors[0].property).toBe('metadata');
    });
  });

  describe('Performance', () => {
    it('should validate quickly', async () => {
      const start = performance.now();
      const dto = new BaseEntityDto({
        id: 'test',
        tenantId: 'test',
        metadata: Array(100).fill({
          key: 'test',
          value: 'value'
        })
      });
      await validate(dto);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
    });
  });
});
```

## API Documentation
```typescript
/**
 * Base Data Transfer Object for entities
 * @template T - Type of metadata value
 * 
 * @remarks
 * This is the foundational DTO class that provides core entity properties
 * and type-safe metadata handling. All domain-specific DTOs should extend
 * this class.
 * 
 * @example
 * ```typescript
 * class UserDto extends BaseEntityDto {
 *   @ApiProperty()
 *   name: string;
 * 
 *   constructor(partial: Partial<UserDto>) {
 *     super(partial);
 *   }
 * }
 * ```
 */
export class BaseEntityDto {
  /** Unique identifier (UUID v4) */
  @ApiProperty({
    description: 'Unique entity identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  // ... other properties
}
```

## Quality Assurance

### Type Coverage
```bash
# Check type coverage
npm run type-coverage

# Verify no any usage
npm run lint:strict

# Check circular dependencies
npm run check:circular
```

### Performance Monitoring
```typescript
// scripts/benchmark.ts
import { Suite } from 'benchmark';
import { BaseEntityDto } from '../src/shared/dtos';

const suite = new Suite();

// Validation Performance
suite.add('BaseEntityDto.validate', {
  defer: true,
  fn: async (deferred: any) => {
    const dto = new BaseEntityDto({
      id: 'test',
      tenantId: 'test',
      metadata: [
        { key: 'test', value: 'value' }
      ]
    });
    await validate(dto);
    deferred.resolve();
  }
}).add('BaseEntityDto.transform', {
  fn: () => {
    return plainToClass(BaseEntityDto, {
      id: 'test',
      tenantId: 'test',
      metadata: [
        { key: 'test', value: 'value' }
      ]
    });
  }
}).on('complete', function(this: any) {
  console.log('Fastest is ' + this.filter('fastest').map('name'));
}).run({ async: true });
