# DTO Refactoring Tasks

## Files to Update

### 1. Server Middleware
#### `src/server/middleware/auth.ts`
- [✓] Import statement: `AccessAccessTokenPayloadDto| RefreshTokenPayloadDtoDto` → `AccessTokenPayloadDto, RefreshTokenPayloadDto`
- [✓] Type definition: `user?: AccessAccessTokenPayloadDto| RefreshTokenPayloadDtoDto` → `user?: AccessTokenPayloadDto | RefreshTokenPayloadDto`
- [✓] Type assertion: `payload as AccessAccessTokenPayloadDto| RefreshTokenPayloadDtoDto` → `payload as AccessTokenPayloadDto | RefreshTokenPayloadDto`

#### `src/server/middleware/async.ts`
- [✓] Update type imports
- [✓] Update type guard function name and types
- [✓] Update function parameter types

### 2. Server Routes
#### `src/server/routes/auth/controller.ts`
- [✓] Update imports for DTOs
- [✓] Update function parameter types
- [✓] Update Omit type expressions
- [✓] Update type assertions in token verification

#### `src/server/routes/auth/dto/auth.dto.ts`
- [✓] Update class definitions and extensions
- [✓] Update type references

### 3. Server Utils
#### `src/server/utils/jwt.ts`
- [✓] Update imports
- [✓] Update type definitions
- [✓] Update function parameter types
- [✓] Update return types

### 4. Types
#### `src/types/auth.ts`
- [✓] Update interface definitions
- [✓] Update type exports
- [✓] Update type references

#### `src/types/express.ts`
- [✓] Update imports
- [✓] Update type references

#### `src/types/index.ts`
- [✓] Update type exports

### 5. Server API
#### `src/server/api/auth.server.ts`
- [✓] Update imports
- [✓] Update type references
- [✓] Update type guard functions

### 6. Server Services
#### `src/server/services/base.service.ts`
- [✓] Update imports
- [✓] Update method parameter types
- [✓] Update return types

### 7. Additional Files Found
#### `src/types/terminal.ts`
- [✓] Update imports and type references

## Naming Conventions
- `RefreshTokenPayloadDtoDto` → `RefreshTokenPayloadDto`
- `AccessAccessTokenPayloadDto` → `AccessTokenPayloadDto`
- `RefreshAccessTokenPayloadDto` → `RefreshTokenPayloadDto`

## Type Union Handling
Special care needed for union type expressions (`|`) to ensure they are properly preserved:
- Preserve spaces around union operator
- Maintain type relationships
- Keep generic type parameters intact

## Verification Steps
1. [✓] Run TypeScript compiler after each file change
2. [✓] Test authentication flows
3. [✓] Verify token generation and validation
4. [✓] Check session management
5. [✓] Test refresh token mechanism

## DTO Refactoring Tasks - Completed ✓

## Summary of Changes
All authentication-related DTOs have been standardized across the codebase:
- Renamed inconsistent DTO classes
- Fixed type imports and exports
- Updated type references and assertions
- Standardized spacing in union types
- Preserved type relationships

## Files Updated

### 1. Server Middleware ✓
#### `src/server/middleware/auth.ts`
- [✓] Standardized DTO imports
- [✓] Fixed type definitions
- [✓] Updated type assertions

#### `src/server/middleware/async.ts`
- [✓] Updated type imports
- [✓] Fixed type references

### 2. Server Routes ✓
#### `src/server/routes/auth.ts`
- [✓] Standardized DTO imports
- [✓] Updated type definitions
- [✓] Fixed variable declarations

#### `src/server/routes/auth/controller.ts`
- [✓] Updated type imports
- [✓] Fixed type references
- [✓] Updated function signatures

### 3. Server API ✓
#### `src/server/api/auth.server.ts`
- [✓] Standardized DTO imports
- [✓] Updated type references
- [✓] Fixed function signatures

### 4. Types ✓
#### `src/types/auth.ts`
- [✓] Updated interface definitions
- [✓] Fixed type exports
- [✓] Updated type references

#### `src/types/express.ts`
- [✓] Standardized DTO imports
- [✓] Updated type references

### 5. Utils ✓
#### `src/server/utils/jwt.ts`
- [✓] Updated type imports
- [✓] Fixed function signatures
- [✓] Updated type assertions

### 6. Services ✓
#### `src/server/services/base.service.ts`
- [✓] Updated type imports
- [✓] Fixed type references
- [✓] Updated method signatures

## Next Steps
1. Run comprehensive test suite
2. Update API documentation
3. Create migration guide for developers
4. Monitor for any runtime issues
