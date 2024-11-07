# Custom React Hooks

A collection of custom React hooks for common functionality.

## Available Hooks

### `useAsync`
Handle async operations with loading, error, and data states.

```typescript
const { loading, error, data, execute } = useAsync(asyncFunction, {
  immediate: true,
  onSuccess: (data) => console.log(data),
  onError: (error) => console.error(error),
  deps: [dependency1, dependency2],
});
```

### `useClickOutside`
Detect clicks outside a specified element.

```typescript
const ref = useClickOutside<HTMLDivElement>(handleClickOutside, 'mousedown');

return <div ref={ref}>Click outside me</div>;
```

### `useDebounce`
Debounce value updates with configurable options.

```typescript
const debouncedValue = useDebounce(value, {
  delay: 500,
  maxWait: 2000,
  leading: true,
  trailing: true,
});
```

### `useIntersectionObserver`
Track element visibility using the Intersection Observer API.

```typescript
const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
  threshold: 0.5,
  freezeOnceVisible: true,
  onVisibilityChange: (visible) => console.log('Element visibility:', visible),
});
```

### `useKeyPress`
Handle keyboard events with predefined key filters.

```typescript
useKeyPress('Enter', handleEnterPress);
useKeyPress(withCtrl('s'), handleSave);

// Predefined filters
useKeyPress(isEnter, handleEnter);
useKeyPress(isEscape, handleEscape);
```

### `useLocalStorage`
Persist state in localStorage with automatic JSON serialization.

```typescript
const [value, setValue] = useLocalStorage('key', initialValue);
setValue(newValue);
```

### `usePrevious`
Track the previous value of a variable.

```typescript
const [count, setCount] = useState(0);
const prevCount = usePrevious(count);

console.log(`Current: ${count}, Previous: ${prevCount}`);

// Works with any type
interface User {
  id: number;
  name: string;
}
const [user, setUser] = useState<User>({ id: 1, name: 'John' });
const prevUser = usePrevious(user);
```

### `useThrottle`
Throttle value updates to improve performance.

```typescript
const throttledValue = useThrottle(value, 1000); // Update at most once per second
```

## Utility Functions

### Key Press Utilities
```typescript
import {
  isEnter,
  isEscape,
  isSpace,
  isArrowUp,
  isArrowDown,
  isArrowLeft,
  isArrowRight,
  isTab,
  isDelete,
  isBackspace,
  withCtrl,
  withShift,
  withAlt,
} from './hooks';

// Use with useKeyPress
useKeyPress(withCtrl(isEnter), handleCtrlEnter);
```

## Type Exports

```typescript
import type {
  UseAsyncOptions,
  UseAsyncResult,
  UseDebounceOptions,
  UseIntersectionObserverOptions,
  UseIntersectionObserverResult,
  UseKeyPressOptions,
} from './hooks';

// Common React types are also re-exported
import type {
  RefObject,
  MutableRefObject,
  Dispatch,
  SetStateAction,
} from './hooks';
```

## Installation

These hooks are part of the project and can be imported directly:

```typescript
import { useAsync, useKeyPress, useLocalStorage } from '../hooks';
```

## Testing

All hooks are thoroughly tested. Run tests with:

```bash
npm test
```

## Contributing

When adding new hooks:
1. Create the hook file with proper TypeScript types
2. Export types and utilities if applicable
3. Add comprehensive tests
4. Update this README with usage examples
5. Add the hook to the index.ts exports

## License

MIT License - Feel free to use these hooks in your projects.
