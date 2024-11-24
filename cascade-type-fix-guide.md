# Cascade Type Error Fix Guide

## Overview
This guide is optimized for Cascade to systematically fix 1088 TypeScript errors across 128 files.

## Phase 1: Error Analysis & Classification

### Step 1: Error Pattern Detection
```typescript
// Error categories to identify:
{
  pattern: string;        // Error pattern
  files: string[];       // Affected files
  fixType: 'missing-type' | 'wrong-type' | 'missing-import' | 'property-mismatch';
  autoFixable: boolean;  // Can Cascade auto-fix this?
}
```

### Step 2: Priority Mapping
1. Base DTOs (Highest Priority)
   - Location: `src/shared/dtos/base/*`
   - Fix first: These are foundational types

2. Server DTOs
   - Location: `src/server/routes/*/dto/*`
   - Dependencies: Base DTOs

3. Client API Types
   - Location: `src/client/api/*`
   - Dependencies: Server DTOs

4. Component Types
   - Location: `src/client/components/*`
   - Dependencies: Client API Types

## Phase 2: Automated Fixes

### Step 1: Missing Type Declarations
```typescript
// Cascade search pattern:
1. Find: variables without type annotations
2. Analyze usage context
3. Apply appropriate type:
   - Infer from usage
   - Extract from related DTOs
   - Generate new interface if complex
```

### Step 2: Property Type Mismatches
```typescript
// Resolution steps:
1. Identify source and target types
2. Compare property signatures
3. Generate type adjustments:
   - Add missing properties
   - Update incorrect types
   - Add optional markers where needed
```

### Step 3: Import Fixes
```typescript
// Auto-fix steps:
1. Scan for undefined types
2. Search codebase for definitions
3. Add missing imports
4. Organize imports
```

## Phase 3: Implementation Order

### 1. Base DTO Fixes (Priority 1)
```typescript
// Fix order:
1. base-entity.dto.ts
2. base-response.dto.ts
3. base-request.dto.ts
4. base-validation.dto.ts
```

### 2. Server DTO Fixes (Priority 2)
```typescript
// Fix order:
1. auth.dto.ts (52 errors)
2. chat.dto.ts (24 errors)
3. sharing.dto.ts (19 errors)
4. Remaining DTOs
```

### 3. Client API Fixes (Priority 3)
```typescript
// Fix order:
1. filesystem.client.ts (21 errors)
2. bookmarks.client.ts (9 errors)
3. hosts.client.ts (7 errors)
4. Remaining clients
```

### 4. Component Fixes (Priority 4)
```typescript
// Fix order:
1. FileExplorer.tsx (37 errors)
2. AdminSettings.tsx (5 errors)
3. Remaining components
```

## Implementation Commands

### For Each File:
1. Analyze Errors
```bash
# Get detailed error info
tsc --noEmit --pretty false [file] > errors.txt
```

2. Generate Type Fixes
```typescript
// Cascade actions:
1. Parse error output
2. Generate type fixes
3. Apply fixes sequentially
4. Verify no new errors
```

3. Verify Changes
```bash
# Run type check
npm run type-check

# Run tests
npm run test

# Check build
npm run build
```

## Progress Tracking

### Error Fix Tracker
```typescript
interface ErrorFixProgress {
  totalErrors: number;
  fixedErrors: number;
  currentFile: string;
  remainingFiles: string[];
  lastSuccessfulFix: {
    file: string;
    errorCount: number;
    fixedCount: number;
    timestamp: string;
  };
}
```

### Quality Gates
1. No new type errors introduced
2. All tests passing
3. Successful build
4. No runtime errors

## Rollback Strategy
```typescript
// For each fix:
1. Create backup of file
2. Apply changes
3. Run verification
4. If failed:
   - Restore from backup
   - Log failed attempt
   - Try alternative fix
```

## Fix Patterns

### Pattern 1: Missing Type Declarations
```typescript
// Before
const data = response.data;

// After
const data: ResponseDTO = response.data;
```

### Pattern 2: Property Type Mismatches
```typescript
// Before
interface UserDTO {
  id: string;
  settings: any;
}

// After
interface UserDTO {
  id: string;
  settings: UserSettings;
}

interface UserSettings {
  theme: string;
  notifications: boolean;
}
```

### Pattern 3: Import Fixes
```typescript
// Before
export class UserController {
  private userService: UserService;
}

// After
import { UserService } from '../services/user.service';

export class UserController {
  private userService: UserService;
}
```

## Verification Steps

### For Each Fix:
1. Run type check on file
2. Run type check on dependent files
3. Run relevant tests
4. Verify build
5. Document changes

### For Each Component:
1. Verify component renders
2. Check all interactions
3. Validate data flow
4. Test error states

## Emergency Procedures

### If Build Breaks:
1. Identify breaking change
2. Revert last fix
3. Try alternative approach
4. Document failed attempt

### If Tests Fail:
1. Check test expectations
2. Update tests if needed
3. Verify business logic
4. Document changes

## Completion Criteria

### File Level:
- No type errors
- Tests passing
- Clean build
- No runtime errors

### Project Level:
- All 1088 errors fixed
- All 128 files verified
- Full test coverage
- Clean production build
