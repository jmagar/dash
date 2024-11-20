# Duplicate Code Analysis

This document tracks all instances of code duplication and similar patterns found in the codebase.

## 1. Utility Functions

### 1.1 Formatting Functions
- Duplicate implementations in:
  - `/client/utils/format.ts`
  - `/client/utils/formatters.ts`
  
Common duplicated functions:
- `formatBytes`
- `formatDate`
- `formatDuration`
- `formatNumber`
- `formatUptime`

### 1.2 Error Handling
Multiple implementations across:
- `/server/utils/error.ts`
- `/server/cache/errors.ts`
- `/types/error.ts`

Common patterns:
```typescript
function createApiError(message: string, cause?: unknown)
function handleApiError<T>(error: unknown)
function isApiError(error: unknown)
```

### 1.3 Process Management
Scattered across:
- `/server/services/process/process-parser.ts`
- `/server/services/process/index.ts`
- `/server/services/process/process-service.ts`

## 2. Socket Handling

### 2.1 Event Handlers
Duplicate patterns in hooks:
- `useHostMetrics.ts`
- `useDockerStats.ts`
- `useLogViewer.ts`
- `useProcessMetrics.ts`

Common pattern:
```typescript
socket.on('event:type', handler);
socket.emit('event:type', { data });
```

## 3. API Route Patterns

### 3.1 CRUD Operations
Similar patterns in:
- `/routes/hosts/index.ts`
- `/routes/notifications.ts`
- `/routes/docker.ts`

### 3.2 Authentication Handling
Duplicate implementations in:
- `/server/utils/jwt.ts`
- `/types/express.ts`
- `/server/middleware/applicationHandler.ts`

## 4. React Hook Patterns

### 4.1 State Management
Common pattern across multiple hooks:
```typescript
const [data, setData] = useState<T>();
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);
```

Found in:
- `useHostMetrics`
- `useDockerStats`
- `useNotifications`
- `useProcessMetrics`

## 5. Service Class Patterns

### 5.1 EventEmitter Services
Multiple services extending EventEmitter:
- `SSHService`
- `NotificationsService`
- `ProcessServiceImpl`
- `LogService`
- `AlertsService`
- `MetricsService`
- `ExecutionService`
- `AgentService`

Common pattern:
```typescript
class SomeService extends EventEmitter {
  private readonly logger = logger.child({ service: 'SomeName' });
  // ... similar initialization and error handling
}
```

## 6. Test Patterns

### 6.1 Test Structure
Similar patterns in test files:
- Common describe/it patterns
- Similar mock setups
- Duplicate error handling tests

## 7. Configuration Handling

### 7.1 Environment Variables
Multiple scattered `process.env` access points with similar patterns:
```typescript
const config = {
  someValue: process.env.SOME_VALUE || 'default',
  someNumber: parseInt(process.env.SOME_NUMBER || '1000', 10),
  someFlag: process.env.SOME_FLAG === 'true'
};
```

## 8. Validation Patterns

### 8.1 Type Validation
Multiple implementations:
- Command validation in terminal routes
- Config validation in cache services
- Request validation in notification routes

## 9. Logging Patterns

### 9.1 Error Logging
Common pattern:
```typescript
logger.error('Operation failed', {
  error: error instanceof Error ? error.message : 'Unknown error',
  ...metadata
});
```

## 10. Cache Management

### 10.1 Cache Operations
Duplicate patterns in:
- Cache invalidation methods
- Cache key generation
- Redis operations

## 11. File Operations

### 11.1 File Handling
Common patterns:
```typescript
async function ensureAndWriteFile(path: string, content: string)
async function readAndParseFile(path: string)
```

## 12. Database Operations

### 12.1 Query Execution
Common patterns in:
- `/server/services/metrics.service.ts`
- `/server/services/notifications.service.ts`
- `/server/services/alerts.service.ts`
- `/server/routes/hosts/processes.ts`

Pattern:
```typescript
try {
  const result = await db.query(
    'SELECT * FROM some_table WHERE condition = $1',
    [param]
  );
  return result.rows;
} catch (error) {
  logger.error('Database operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    operation: 'select'
  });
  throw error;
}
```

### 12.2 Transaction Handling
Similar transaction patterns across different services:
```typescript
async function withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 13. Middleware Patterns

### 13.1 Express Middleware Setup
Common patterns in:
- `/server/server.ts`
- `/server/middleware/applicationHandler.ts`
- `/server/metrics.ts`

Pattern:
```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    // middleware logic
    next();
  } catch (error) {
    next(error);
  }
});
```

### 13.2 Error Middleware
Similar error handling middleware across different files:
```typescript
export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path
  });
  
  res.status(500).json({
    success: false,
    error: error.message
  });
};
```

### 13.3 Authentication Middleware
Multiple implementations of auth checking:
```typescript
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  // Token verification logic
};
```

## 14. WebSocket Patterns

### 14.1 Socket.IO Event Handling
Duplicate patterns in:
- `/server/metrics.ts`
- `/server/services/log.service.ts`
- `/server/services/process/process-service.ts`
- `/server/services/agent.service.ts`

Common pattern:
```typescript
io.on('connection', (socket) => {
  socket.on('event:type', async (data) => {
    try {
      // Handle event
      socket.emit('response:type', result);
    } catch (error) {
      socket.emit('error', {
        type: 'event:type',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  socket.on('disconnect', () => {
    // Cleanup
  });
});
```

### 14.2 WebSocket Server Setup
Similar patterns in:
- `/server/routes/ws/manager.ts`
- `/server/routes/ws/agent.ts`

Pattern:
```typescript
class WebSocketManager {
  private wss: WebSocketServer;

  constructor() {
    this.wss = new WebSocketServer({ server, path: '/ws/path' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws) => {
      ws.on('message', this.handleMessage);
      ws.on('close', this.handleClose);
      ws.on('error', this.handleError);
      ws.on('pong', this.heartbeat);
    });
  }
}
```

### 14.3 WebSocket Client Handling
Common patterns in client-side code:
```typescript
socket.on('connect', () => {
  logger.info('Socket connected', { id: socket.id });
});

socket.on('disconnect', (reason) => {
  logger.info('Socket disconnected', { reason });
});

socket.on('connect_error', (error) => {
  logger.error('Socket connection error', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
});
```

## 15. Redux Patterns

### 15.1 Slice Creation
Similar patterns in:
- `/client/store/slices/uiSlice.ts`
- `/client/store/slices/notificationSlice.ts`
- `/client/store/slices/processSlice.ts`
- `/client/store/slices/hostSlice.ts`
- `/client/store/slices/dockerSlice.ts`

Common pattern:
```typescript
const someSlice = createSlice({
  name: 'sliceName',
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<Data>) => {
      state.data = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch data';
      });
  }
});
```

### 15.2 Async Thunk Creation
Similar patterns across slices:
```typescript
export const fetchData = createAsyncThunk<
  ResponseType,
  void,
  { rejectValue: string }
>('slice/fetchData', async (_, { rejectWithValue }) => {
  try {
    const response = await api.getData();
    return response.data;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Failed to fetch data'
    );
  }
});
```

### 15.3 Redux Hooks Usage
Common patterns in components:
```typescript
const Component = () => {
  const dispatch = useDispatch();
  const data = useSelector(selectData);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);

  useEffect(() => {
    dispatch(fetchData());
  }, [dispatch]);
};
```

## 16. Database Operation Patterns

### 16.1 Prisma Client Setup
Common pattern in database initialization:
```typescript
// src/server/db/index.ts
const prisma = new PrismaClient();
export default prisma;
```

### 16.2 API Error Handling
Similar error handling patterns across API clients:
```typescript
try {
  const response = await api.someOperation();
  return response.data;
} catch (error) {
  logger.error('Failed to perform operation:', {
    error,
    additionalContext
  });
  throw createApiError('Failed to perform operation', error);
}
```

### 16.3 CRUD Operation Patterns
Similar CRUD patterns across different resources:
```typescript
// Create
export async function createResource(data: CreateRequest): Promise<Resource> {
  try {
    const response = await api.post(ENDPOINTS.CREATE, data);
    return response.data;
  } catch (error) {
    throw createApiError('Failed to create resource', error);
  }
}

// Update
export async function updateResource(id: string, data: Partial<Resource>): Promise<Resource> {
  try {
    const response = await api.patch(ENDPOINTS.UPDATE(id), data);
    return response.data;
  } catch (error) {
    throw createApiError('Failed to update resource', error);
  }
}

// Delete
export async function deleteResource(id: string): Promise<void> {
  try {
    await api.delete(ENDPOINTS.DELETE(id));
  } catch (error) {
    throw createApiError('Failed to delete resource', error);
  }
}
```

### 16.4 API Endpoint Definition
Common pattern for defining API endpoints:
```typescript
const ENDPOINTS = {
  CREATE: '/resource',
  UPDATE: (id: string) => `/resource/${id}`,
  DELETE: (id: string) => `/resource/${id}`,
  GET: (id: string) => `/resource/${id}`,
  LIST: '/resources'
} as const;
```

## 17. Authentication Patterns

### 17.1 Auth Hook Usage
Similar patterns of using auth hooks across components:
```typescript
const Component = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <ProtectedContent />;
};
```

### 17.2 Auth Context Implementation
Common patterns in auth context:
```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const login = useCallback(async (username: string, password: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    // Handle response
  } catch (error) {
    // Handle error
  }
}, []);

const logout = useCallback(async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST'
    });
    // Clear auth state
    navigate('/login');
  } catch (error) {
    // Handle error
  }
}, []);
```

### 17.3 Auth Middleware
Similar patterns in authentication middleware:
```typescript
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError('User not authenticated', undefined, 401);
    }
    
    // Verify token
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}
```

### 17.4 Protected Route Pattern
Common pattern for protecting routes:
```typescript
const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
```

---
*Note: This is a living document that will be updated as more duplicate patterns are identified.*
