# Complete Type System Inventory

## Shared Types (`src/types/`)

### API Types
- `ApiResponse<T>`
- `ApiError`
- `ApiResult<T>`
- `ApiEndpoint`

### Authentication Types
- `LoginRequest`
- `LoginResponse`
- `LogoutResponse`
- `ValidateResponse`
- `RefreshTokenRequest`
- `RefreshTokenResponse`
- `AccessTokenPayloadDto`
- `RefreshTokenPayloadDto`
- `AuthenticatedUser`
- `JWTPayload`

### Core Model Types
- `Host`
- `CreateHostRequest`
- `UpdateHostRequest`
- `Container`
- `DockerContainer`
- `DockerNetwork`
- `DockerVolume`
- `Stack`
- `FileItem`
- `Package`
- `CommandRequest`
- `Command`
- `CommandResult`
- `UserRegistration`
- `SSHConfig`
- `SystemStats`

### Process Types
- `ProcessInfo`
- `ProcessMetrics`
- `ProcessLimits`
- `ProcessStats`

### Docker Types
- `DockerStats`
- `ContainerStats`
- `DockerServiceConfig`
- `DockerServiceOptions`

### File System Types
- `FileSystemItem`
- `FileSystemStats`
- `FileSystemPermissions`

### Logging Types
- `LogMetadata`
- `LogConfig`
- `LogFormatter`
- `LogTransport`
- `LoggerOptions`

### Socket Types
- `SocketEvent`
- `SocketMessage`
- `SocketConnection`

### Terminal Types
- `TerminalSize`
- `TerminalOptions`
- `TerminalEventPayload`
- Enums:
  - `ConnectionStatus`
  - `CommandStatus`
  - `TerminalEventType`

### Environment Types
- Enums:
  - `Environment` (Development/Staging/Production)

### Agent Types
- `AgentInfoSchema` (Zod schema)
- Protocol Message Types
- Agent Operation Result Types

### Base DTOs (moved from shared/dtos)
- `BaseAuditDto`
- `BasePermissionDto`
- `AuditChange`

### Shared Enums
- `PermissionType`
- `ResourceType`
- `ThemeMode`
- `ServiceStatus`

## Server-Specific Types (`src/server/`)

### Route DTOs

#### Chat
- `ChatDto`
- `ChatMessageDto`
- `ChatConfigDto`
- Enums:
  - `ChatModel`
  - `ChatRole`

#### Terminal
- `TerminalDto`
- `TerminalSessionDto`
- `CommandDto`

#### Status
- `StatusDto`
- `ServiceStatusDto`
- Enums:
  - `ServiceStatus`

#### Preferences
- `PreferencesDto`
- Enums:
  - `ThemeMode`

#### Notifications
- `NotificationDto`
- Enums:
  - `NotificationType`

#### Filesystem
- `LocationDto`
- `FileSystemCredentialsDto`
- `ListFilesDto`
- `UploadFilesDto`
- `CopyMoveDto`
- `CreateDirectoryDto`
- `DeleteFilesDto`
- `FileFilterDto`
- `SelectFilesDto`
- `SearchFilesDto`
- `FileOperationsDto`
- `FilePathDto`
- `MetadataDto`
- `OperationsDto`
- `PermissionsDto`
- `ResponsesDto`
- `SearchDto`
- `SharingDto`
- `SpaceDto`
- `FavoritesDto`

#### Bookmarks
- `CreateBookmarkRequest`
- `UpdateBookmarkRequest`
- `BookmarkResponse`
- `BookmarkListResponse`

#### Compression
- `CompressFilesDto`
- `DecompressFileDto`

#### Hosts
- `HostDto`
- `AgentCredentialsDto`

#### Docker
- `DockerParams`
- `ContainerDto`
- `StackDto`
- `ContainerResponse`
- `StackResponse`
- `CacheContainersDto`
- `CacheStacksDto`

### Service Types

#### Agent Service
- `AgentInfo`
- `AgentStatus`
- `AgentMetrics`
- `AgentHeartbeat`
- `AgentConfig`

#### Cache Service
- `ICacheService`
- `CacheConfig`
- `CacheEntry`

#### Filesystem Service
- `FileSystemType`
- `FileSystemService`
- `FileSystemProvider`

## Client-Specific Types (`src/client/`)

### Component Props
- `ProcessMonitorProps`
- `MetricsDisplayProps`
- `FileExplorerProps`
- `TerminalProps`
- `ChatProps`
- `ChatDialogProps`
- `FilePreviewProps`
- `LoadingIndicatorProps`
- `NotificationBellProps`
- `ProcessLimitsProps`
- `StorageManagerProps`
- `UserProfileProps`

### Hook Types
- `UseProcessMetricsResult`
- `ProcessListData`
- `ProcessUpdateData`
- `ProcessErrorData`
- `UseQueryResult`
- `UseMutationResult`
- `UseAuthResult`
- `UseSocketResult`
- `UseThemeResult`
- `UseLoadingResult`
- `UseNotificationsResult`
- `UseSettingsResult`

### Context Types
- `ChatbotContext`
- `FileSystemContext`
- `TerminalContext`
- `ThemeContext`
- `AuthContext`
- `SocketContext`

### State Types
- `LoadingState`
- `AsyncState`
- `DialogState`
- `NotificationState`
- `ThemeState`
- `ProcessState`

### UI Types
- `FileSystemUIProps`
- `TerminalUIProps`
- `ChatbotUIProps`

### Component Types
- `TerminalProps`
- `FileExplorerProps`
- `ChatWindowProps`

## Third-Party Type Declarations (`src/types/declarations/`)
- `bcrypt.d.ts`
- `cors.d.ts`
- `dockerode.d.ts`
- `express-fileupload.d.ts`
- `ioredis.d.ts`
- `js-yaml.d.ts`
- `jsonwebtoken.d.ts`
- `pg.d.ts`
- `smb2.d.ts`
- `socket.io-client.d.ts`
- `socket.io.d.ts`
- `ssh2.d.ts`
- `webdav.d.ts`
- `xterm-addons.d.ts`
- `xterm.d.ts`

## Type Organization Summary

1. **Shared Types** (`src/types/`):
   - API contracts
   - Core data models
   - Shared enums
   - Base DTOs
   - Type declarations

2. **Server Types** (`src/server/`):
   - Route-specific DTOs
   - Service-specific types
   - Server implementation types

3. **Client Types** (`src/client/`):
   - UI component types
   - Client-specific contexts
   - Client implementation types
