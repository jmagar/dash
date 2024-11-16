import { renderHook } from '@testing-library/react-hooks';
import { usePrevious } from '../../../../src/client/hooks/usePrevious';

describe('usePrevious', () => {
  it('should return undefined on first render', () => {
    const { result } = renderHook(() => usePrevious(0));
    expect(result.current).toBeUndefined();
  });

  it('should return previous number value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      {
        initialProps: { value: 0 },
      },
    );

    expect(result.current).toBeUndefined();

    rerender({ value: 1 });
    expect(result.current).toBe(0);

    rerender({ value: 2 });
    expect(result.current).toBe(1);
  });

  it('should return previous string value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      {
        initialProps: { value: 'initial' },
      },
    );

    expect(result.current).toBeUndefined();

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    rerender({ value: 'final' });
    expect(result.current).toBe('updated');
  });

  it('should handle boolean values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      {
        initialProps: { value: false },
      },
    );

    expect(result.current).toBeUndefined();

    rerender({ value: true });
    expect(result.current).toBe(false);

    rerender({ value: false });
    expect(result.current).toBe(true);
  });

  it('should handle object values', () => {
    type TestObject = { test: boolean };
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious<TestObject>(value),
      {
        initialProps: { value: { test: false } },
      },
    );

    expect(result.current).toBeUndefined();

    const nextValue = { test: true };
    rerender({ value: nextValue });
    expect(result.current).toEqual({ test: false });
  });

  it('should handle array values', () => {
    type TestArray = number[];
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious<TestArray>(value),
      {
        initialProps: { value: [1, 2, 3] },
      },
    );

    expect(result.current).toBeUndefined();

    rerender({ value: [4, 5, 6] });
    expect(result.current).toEqual([1, 2, 3]);
  });

  it('should handle nullable values', () => {
    const initialValue = 'test';
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      {
        initialProps: { value: initialValue as string | null },
      },
    );

    expect(result.current).toBeUndefined();

    const nullValue = null as string | null;
    rerender({ value: nullValue });
    expect(result.current).toBe(initialValue);

    const newValue = 'new value' as string | null;
    rerender({ value: newValue });
    expect(result.current).toBe(nullValue);
  });

  it('should handle optional values', () => {
    const initialValue = 'test';
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      {
        initialProps: { value: initialValue as string | undefined },
      },
    );

    expect(result.current).toBeUndefined();

    const undefinedValue = undefined as string | undefined;
    rerender({ value: undefinedValue });
    expect(result.current).toBe(initialValue);

    const newValue = 'new value' as string | undefined;
    rerender({ value: newValue });
    expect(result.current).toBe(undefinedValue);
  });
});
