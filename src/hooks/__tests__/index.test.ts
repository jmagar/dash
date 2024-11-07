import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as hooks from '../index';

describe('Hooks exports', () => {
  it('should export all hooks correctly', () => {
    expect(hooks.useAsync).toBeDefined();
    expect(hooks.useClickOutside).toBeDefined();
    expect(hooks.useIntersectionObserver).toBeDefined();
    expect(hooks.useKeyPress).toBeDefined();
    expect(hooks.useLocalStorage).toBeDefined();
    expect(hooks.useThrottle).toBeDefined();
  });

  it('should export all key press utilities', () => {
    expect(hooks.isEnter).toBeDefined();
    expect(hooks.isEscape).toBeDefined();
    expect(hooks.isSpace).toBeDefined();
    expect(hooks.isArrowUp).toBeDefined();
    expect(hooks.isArrowDown).toBeDefined();
    expect(hooks.isArrowLeft).toBeDefined();
    expect(hooks.isArrowRight).toBeDefined();
    expect(hooks.isTab).toBeDefined();
    expect(hooks.isDelete).toBeDefined();
    expect(hooks.isBackspace).toBeDefined();
    expect(hooks.withCtrl).toBeDefined();
    expect(hooks.withShift).toBeDefined();
    expect(hooks.withAlt).toBeDefined();
  });

  it('should maintain hook functionality when imported from index', () => {
    // Test useLocalStorage
    const { result: storageResult } = renderHook(() => hooks.useLocalStorage('test-key', 'initial'));
    expect(storageResult.current[0]).toBe('initial');
    expect(typeof storageResult.current[1]).toBe('function');

    // Test useThrottle
    const { result: throttleResult } = renderHook(() => hooks.useThrottle('test', 100));
    expect(throttleResult.current).toBe('test');

    // Test useAsync
    const { result: asyncResult } = renderHook(() => hooks.useAsync(async () => 'test'));
    expect(asyncResult.current.loading).toBe(false);
    expect(asyncResult.current.error).toBeNull();
    expect(asyncResult.current.data).toBeNull();
    expect(typeof asyncResult.current.execute).toBe('function');
  });

  it('should export type definitions', () => {
    // This is a type-level test that will be checked by TypeScript
    type TestTypes = {
      asyncOptions: hooks.UseAsyncOptions;
      asyncResult: hooks.UseAsyncResult<string>;
      intersectionOptions: hooks.UseIntersectionObserverOptions;
      intersectionResult: hooks.UseIntersectionObserverResult<HTMLDivElement>;
      keyPressOptions: hooks.UseKeyPressOptions;
      ref: hooks.RefObject<HTMLElement>;
      mutableRef: hooks.MutableRefObject<unknown>;
      dispatch: hooks.Dispatch<hooks.SetStateAction<unknown>>;
    };

    // Create a value to satisfy TypeScript
    const _testTypes: TestTypes = {
      asyncOptions: {},
      asyncResult: {
        loading: false,
        error: null,
        data: '',
        execute: async () => '',
        clearError: () => {},
        setError: () => {},
      },
      intersectionOptions: {},
      intersectionResult: {
        ref: { current: null },
        isVisible: false,
      },
      keyPressOptions: {},
      ref: { current: null },
      mutableRef: { current: null },
      dispatch: () => {},
    };

    // Just to make TypeScript happy about unused variables
    void _testTypes;
  });

  it('should properly type the utility functions', () => {
    const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });

    expect(hooks.isEnter(mockEvent)).toBe(true);
    expect(hooks.isEscape(mockEvent)).toBe(false);

    const ctrlEnter = hooks.withCtrl(hooks.isEnter);
    expect(ctrlEnter(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }))).toBe(true);
    expect(ctrlEnter(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: false }))).toBe(false);
  });
});
