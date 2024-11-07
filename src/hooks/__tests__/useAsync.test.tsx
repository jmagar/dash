import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAsync } from '../useAsync';

describe('useAsync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAsync(async () => {}));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('should handle successful async function', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockFn = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsync(mockFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockData);
  });

  it('should handle async function error', async () => {
    const errorMessage = 'Test error';
    const mockFn = jest.fn().mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAsync(mockFn));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toBeNull();
  });

  it('should handle immediate execution', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockFn = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useAsync(mockFn, { immediate: true })
    );

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await jest.runAllTimers();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockData);
  });

  it('should handle dependencies changes', async () => {
    const mockFn = jest.fn().mockResolvedValue(null);
    const { rerender } = renderHook(
      ({ deps }) => useAsync(mockFn, { deps, immediate: true }),
      {
        initialProps: { deps: [1] },
      }
    );

    expect(mockFn).toHaveBeenCalledTimes(1);

    rerender({ deps: [2] });
    expect(mockFn).toHaveBeenCalledTimes(2);

    rerender({ deps: [2] });
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle cleanup on unmount', async () => {
    const mockFn = jest.fn().mockResolvedValue(null);
    const { unmount } = renderHook(() =>
      useAsync(mockFn, { immediate: true })
    );

    unmount();

    await act(async () => {
      await jest.runAllTimers();
    });

    // No state updates should occur after unmount
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle execute with parameters', async () => {
    const mockFn = jest.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useAsync(mockFn));

    await act(async () => {
      await result.current.execute('param1', 'param2');
    });

    expect(mockFn).toHaveBeenCalledWith('param1', 'param2');
  });

  it('should clear error on new execution', async () => {
    const errorMessage = 'Test error';
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAsync(mockFn));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected
      }
    });

    expect(result.current.error).toBe(errorMessage);

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBeNull();
  });

  it('should handle manual error setting', () => {
    const { result } = renderHook(() => useAsync(async () => {}));

    act(() => {
      result.current.setError('Manual error');
    });

    expect(result.current.error).toBe('Manual error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
