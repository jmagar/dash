# Custom React Hooks

A collection of reusable React hooks for common functionality.

## useAsync

A hook for handling asynchronous operations with loading, error, and data states.

```typescript
const { data, loading, error, execute } = useAsync(asyncFunction, {
  immediate: true,
  onSuccess: (data) => console.log(data),
  onError: (error) => console.error(error),
  deps: [dependency1, dependency2],
});
```

## useDebounce

A hook that returns a debounced value that only updates after a specified delay.

```typescript
const debouncedValue = useDebounce(value, { delay: 500 });
```

## useThrottle

A hook that returns a throttled value that only updates at most once in a specified interval.

```typescript
const throttledValue = useThrottle(value, { delay: 1000 });
```

## useKeyPress

A hook for handling keyboard events with optional modifier keys.

```typescript
useKeyPress('s', (event) => {
  if (event.ctrlKey) {
    // Handle Ctrl+S
  }
});
```

## useLocalStorage

A hook for persisting state in localStorage with automatic JSON serialization.

```typescript
const [value, setValue] = useLocalStorage('key', defaultValue);
```

## usePrevious

A hook that returns the previous value of a variable.

```typescript
const prevValue = usePrevious(value);
```

## useIntersectionObserver

A hook for detecting when an element enters or leaves the viewport.

```typescript
const [ref, isVisible] = useIntersectionObserver({
  threshold: 0.1,
  rootMargin: '50px',
});
```

## useClickOutside

A hook for detecting clicks outside of a component.

```typescript
const ref = useClickOutside<HTMLDivElement>(onClickOutside);
```

## useDockerUpdates

A hook for receiving real-time Docker container updates via WebSocket.

```typescript
useDockerUpdates({
  onUpdate: (update) => console.log(update),
  enabled: true,
});
```

## useClipboard

A hook for copying text to clipboard with success and error states.

```typescript
const { copyToClipboard, hasCopied, error } = useClipboard({ timeout: 2000 });

// Example usage
<button 
  onClick={() => copyToClipboard("Text to copy")}
  disabled={hasCopied}
>
  {hasCopied ? "Copied!" : "Copy to clipboard"}
</button>
```

## Installation

These hooks are part of the project and can be imported directly:

```typescript
import { useAsync, useDebounce, useThrottle } from '../hooks';
```

## Testing

Each hook has corresponding test files in the `__tests__` directory. Run tests with:

```bash
npm test
```

## Contributing

When adding new hooks:

1. Create the hook file in the `hooks` directory
2. Add corresponding test file in `__tests__` directory
3. Add TypeScript types and documentation
4. Update this README with usage examples
5. Add the hook to the index exports
