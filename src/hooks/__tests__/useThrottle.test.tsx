import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useThrottle } from '../useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should return initial value immediately', () => {
    const initialValue = 'test';
    const { result } = renderHook(() => useThrottle(initialValue, 1000));
    expect(result.current).toBe(initialValue);
  });

  it('should throttle value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, limit }) => useThrottle(value, limit),
      {
        initialProps: { value: 'initial', limit: 1000 },
      }
    );

    expect(result.current).toBe('initial');

    // Update value immediately
    rerender({ value: 'update1', limit: 1000 });
    expect(result.current).toBe('initial');

    // Fast forward 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('initial');

    // Fast forward remaining 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('update1');

    // Update value again
    rerender({ value: 'update2', limit: 1000 });
    expect(result.current).toBe('update1');

    // Fast forward full throttle period
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe('update2');
  });

  it('should handle different throttle limits', () => {
    const { result, rerender } = renderHook(
      ({ value, limit }) => useThrottle(value, limit),
      {
        initialProps: { value: 'initial', limit: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // Update value immediately
    rerender({ value: 'update', limit: 500 });
    expect(result.current).toBe('initial');

    // Fast forward 250ms
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe('initial');

    // Fast forward remaining 250ms
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current).toBe('update');
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
    const { unmount } = renderHook(() => useThrottle('test', 1000));

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should handle rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, limit }) => useThrottle(value, limit),
      {
        initialProps: { value: 'initial', limit: 1000 },
      }
    );

    // Simulate rapid value changes
    rerender({ value: 'update1', limit: 1000 });
    rerender({ value: 'update2', limit: 1000 });
    rerender({ value: 'update3', limit: 1000 });
    expect(result.current).toBe('initial');

    // Fast forward throttle period
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    // Should only get the latest value
    expect(result.current).toBe('update3');
  });

  it('should handle object values', () => {
    const initialValue = { count: 0 };
    const { result, rerender } = renderHook(
      ({ value, limit }) => useThrottle(value, limit),
      {
        initialProps: { value: initialValue, limit: 1000 },
      }
    );

    expect(result.current).toEqual(initialValue);

    const newValue = { count: 1 };
    rerender({ value: newValue, limit: 1000 });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toEqual(newValue);
  });
});
