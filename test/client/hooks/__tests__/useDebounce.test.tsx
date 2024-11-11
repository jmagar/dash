import { renderHook, act } from '@testing-library/react';

import '@testing-library/jest-dom';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', { delay: 500 }));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates with delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, { delay: 500 }),
      { initialProps: { value: 'initial' } },
    );

    // Update value
    rerender({ value: 'updated' });
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
    expect(result.current).toBe('updated');
  });

  it('should handle leading option', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, { delay: 500, leading: true }),
      { initialProps: { value: 'initial' } },
    );

    // Update value - should update immediately due to leading
    rerender({ value: 'updated' });
    expect(result.current).toBe('updated');

    // Update again within delay - should not update
    rerender({ value: 'updated again' });
    expect(result.current).toBe('updated');

    // Fast forward past delay
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated again');
  });

  it('should handle trailing option', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, { delay: 500, trailing: false, leading: true }),
      { initialProps: { value: 'initial' } },
    );

    // Update value - should update immediately due to leading
    rerender({ value: 'updated' });
    expect(result.current).toBe('updated');

    // Update again within delay - should not update
    rerender({ value: 'updated again' });
    expect(result.current).toBe('updated');

    // Fast forward past delay - should not update due to trailing: false
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle maxWait option', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, { delay: 1000, maxWait: 500 }),
      { initialProps: { value: 'initial' } },
    );

    // Update value
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    // Fast forward to maxWait - should update even though delay hasn't passed
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle number as delay option', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } },
    );

    // Update value
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    // Fast forward delay
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('test', { delay: 500 }));

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should handle rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, { delay: 500 }),
      { initialProps: { value: 'initial' } },
    );

    // Simulate rapid value changes
    rerender({ value: 'update1' });
    rerender({ value: 'update2' });
    rerender({ value: 'update3' });
    expect(result.current).toBe('initial');

    // Fast forward delay
    act(() => {
      jest.advanceTimersByTime(500);
    });
    // Should only get the latest value
    expect(result.current).toBe('update3');
  });
});
