import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { usePrevious } from '../usePrevious';

describe('usePrevious', () => {
  it('should return undefined on first render', () => {
    const { result } = renderHook(() => usePrevious('initial'));
    expect(result.current).toBeUndefined();
  });

  it('should return previous value after update', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 'initial' } }
    );

    // First render should return undefined
    expect(result.current).toBeUndefined();

    // Update value
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    // Update again
    rerender({ value: 'updated again' });
    expect(result.current).toBe('updated');
  });

  it('should handle different value types', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: unknown }) => usePrevious(value),
      { initialProps: { value: 42 } }
    );

    // First render should return undefined
    expect(result.current).toBeUndefined();

    // Update with number
    rerender({ value: 43 });
    expect(result.current).toBe(42);

    // Update with object
    const obj = { test: true };
    rerender({ value: obj });
    expect(result.current).toBe(43);

    // Update with array
    const arr = [1, 2, 3];
    rerender({ value: arr });
    expect(result.current).toEqual(obj);
  });

  it('should handle null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: unknown }) => usePrevious(value),
      { initialProps: { value: 'initial' } }
    );

    // Update with undefined
    rerender({ value: undefined });
    expect(result.current).toBe('initial');

    // Update with null
    rerender({ value: null });
    expect(result.current).toBeUndefined();

    // Update with value again
    rerender({ value: 'final' });
    expect(result.current).toBeNull();
  });

  it('should handle complex objects', () => {
    interface ComplexObject {
      id: number;
      name: string;
      data: {
        value: number;
        items: string[];
      };
    }

    const initialValue: ComplexObject = {
      id: 1,
      name: 'test',
      data: {
        value: 42,
        items: ['a', 'b'],
      },
    };

    const { result, rerender } = renderHook(
      (props: { value: ComplexObject }) => usePrevious(props.value),
      { initialProps: { value: initialValue } }
    );

    const updatedValue: ComplexObject = {
      id: 2,
      name: 'updated',
      data: {
        value: 43,
        items: ['c', 'd'],
      },
    };

    rerender({ value: updatedValue });
    expect(result.current).toEqual(initialValue);
  });
});
