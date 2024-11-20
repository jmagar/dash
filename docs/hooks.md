# API Query Hooks Documentation

This document describes the custom hooks available for handling API requests in the SSH application.

## Table of Contents
- [useQuery](#usequery)
- [useMutation](#usemutation)
- [useInfiniteQuery](#useinfinitequery)

## useQuery

A hook for fetching data from an API endpoint with built-in state management.

### Usage

```typescript
const { 
  data,
  error,
  isLoading,
  isError,
  refetch
} = useQuery(queryFn, options);
```

### Parameters

- `queryFn`: () => Promise<T>
  - A function that returns a promise resolving to the data
- `options`: QueryOptions
  ```typescript
  interface QueryOptions<T> {
    enabled?: boolean;              // Whether the query should auto-execute
    refetchInterval?: number;       // Auto-refetch interval in milliseconds
    onSuccess?: (data: T) => void;  // Callback when query succeeds
    onError?: (error: Error) => void; // Callback when query fails
    initialData?: T;                // Initial data before the query executes
  }
  ```

### Returns

- `data`: The fetched data (type T)
- `error`: Error object if the request failed
- `isLoading`: Boolean indicating if the request is in progress
- `isError`: Boolean indicating if the request failed
- `refetch`: Function to manually trigger a refetch

### Example

```typescript
function HostList() {
  const { 
    data: hosts, 
    isLoading, 
    error 
  } = useQuery(() => hostsClient.listHosts(), {
    refetchInterval: 5000,
    onError: (error) => toast.error(`Failed to fetch hosts: ${error.message}`)
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <HostTable hosts={hosts} />;
}
```

## useMutation

A hook for making data mutations (POST, PUT, DELETE requests) with state management.

### Usage

```typescript
const [
  mutate,
  { isLoading, error, isError, reset }
] = useMutation(mutationFn, options);
```

### Parameters

- `mutationFn`: (variables: TVariables) => Promise<TData>
  - Function that performs the mutation
- `options`: MutationOptions
  ```typescript
  interface MutationOptions<TData, TVariables> {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | null) => void;
  }
  ```

### Returns

- `mutate`: Function to trigger the mutation
- `isLoading`: Boolean indicating if the mutation is in progress
- `error`: Error object if the mutation failed
- `isError`: Boolean indicating if the mutation failed
- `reset`: Function to reset the mutation state

### Example

```typescript
function CreateHostForm() {
  const [createHost, { isLoading }] = useMutation(
    (host: CreateHostRequest) => hostsClient.createHost(host),
    {
      onSuccess: () => {
        toast.success('Host created successfully');
        queryClient.invalidateQueries('hosts');
      },
      onError: (error) => {
        toast.error(`Failed to create host: ${error.message}`);
      }
    }
  );

  const handleSubmit = async (data: CreateHostRequest) => {
    await createHost(data);
  };

  return <Form onSubmit={handleSubmit} disabled={isLoading} />;
}
```

## useInfiniteQuery

A hook for handling paginated data with infinite scrolling support.

### Usage

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  error
} = useInfiniteQuery(queryFn, options);
```

### Parameters

- `queryFn`: (pageParam: number) => Promise<TData>
  - Function that fetches a page of data
- `options`: InfiniteQueryOptions
  ```typescript
  interface InfiniteQueryOptions<TData> {
    getNextPageParam?: (lastPage: TData) => number | null;
    initialPageParam?: number;
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
  }
  ```

### Returns

- `data`: Array of all fetched pages
- `fetchNextPage`: Function to fetch the next page
- `hasNextPage`: Boolean indicating if there are more pages
- `isFetchingNextPage`: Boolean indicating if the next page is being fetched
- `isLoading`: Boolean indicating if the initial request is loading
- `error`: Error object if the request failed

### Example

```typescript
function ChatHistory() {
  const {
    data: messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery(
    (pageParam) => chatClient.getMessages({ page: pageParam }),
    {
      getNextPageParam: (lastPage) => lastPage.nextPage,
      initialPageParam: 1
    }
  );

  return (
    <div>
      <MessageList messages={messages} />
      {hasNextPage && (
        <LoadMoreButton
          onClick={() => fetchNextPage()}
          loading={isFetchingNextPage}
        />
      )}
    </div>
  );
}
```

## Best Practices

1. **Error Handling**
   - Always provide error handling through the `onError` callback
   - Use toast notifications or error boundaries for user feedback

2. **Loading States**
   - Show loading indicators during initial loads
   - Use skeleton loaders for better UX

3. **Data Invalidation**
   - After mutations, invalidate related queries to refresh data
   - Use the queryClient's `invalidateQueries` method

4. **Optimistic Updates**
   - For better UX, update the UI immediately before the mutation completes
   - Provide rollback logic in case of errors

5. **TypeScript**
   - Always provide proper types for query/mutation functions
   - Utilize generic types for better type safety

## Examples

Here are some common use cases:

### Dependent Queries

```typescript
function UserPosts() {
  const { data: user } = useQuery(() => authClient.getCurrentUser());
  const { data: posts } = useQuery(
    () => postsClient.getUserPosts(user.id),
    { enabled: !!user }
  );
}
```

### Optimistic Updates

```typescript
function TodoList() {
  const { data: todos } = useQuery(() => todosClient.list());
  const [updateTodo] = useMutation(
    (todo) => todosClient.update(todo),
    {
      onMutate: async (newTodo) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries('todos');
        
        // Snapshot the previous value
        const previousTodos = queryClient.getQueryData('todos');
        
        // Optimistically update
        queryClient.setQueryData('todos', old => ({
          ...old,
          [newTodo.id]: newTodo
        }));
        
        // Return context with snapshotted value
        return { previousTodos };
      },
      onError: (err, newTodo, context) => {
        // Roll back on error
        queryClient.setQueryData('todos', context.previousTodos);
      }
    }
  );
}
```
