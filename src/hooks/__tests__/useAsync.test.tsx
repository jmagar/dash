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
    const asyncFn = jest.fn();
    const { result } = renderHook(() => useAsync(asyncFn));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('should handle successful async execution', async () => {
    const mockData = { id: 1, name: 'Test' };
    const asyncFn = jest.fn().mockResolvedValue(mockData);
    const { result } = renderHook(() => useAsync(asyncFn));

    expect(result.current.loading).toBe(false);

    await act(async () => {
      const executeResult = result.current.execute();
      expect(result.current.loading).toBe(true);
      await executeResult;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle async execution failure', async () => {
    const mockError = new Error('Test error');
    const asyncFn = jest.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Test error');
    expect(result.current.data).toBeNull();
  });

  it('should execute immediately when immediate option is true', async () => {
    const mockData = { id: 1, name: 'Test' };
    const asyncFn = jest.fn().mockResolvedValue(mockData);
    const { result } = renderHook(() => useAsync(asyncFn, { immediate: true }));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it('should call onSuccess callback on successful execution', async () => {
    const mockData = { id: 1, name: 'Test' };
    const asyncFn = jest.fn().mockResolvedValue(mockData);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useAsync(asyncFn, { onSuccess }));

    await act(async () => {
      await result.current.execute();
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('should call onError callback on execution failure', async () => {
    const mockError = new Error('Test error');
    const asyncFn = jest.fn().mockRejectedValue(mockError);
    const onError = jest.fn();
    const { result } = renderHook(() => useAsync(asyncFn, { onError }));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected error
      }
    });

    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('should clear error when clearError is called', () => {
    const asyncFn = jest.fn();
    const { result } = renderHook(() => useAsync(asyncFn));

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should respect dependencies for immediate execution', async () => {
    const mockData = { id: 1, name: 'Test' };
    const asyncFn = jest.fn().mockResolvedValue(mockData);
    const deps = [1];
    const { result, rerender } = renderHook(
      ({ deps }) => useAsync(asyncFn, { immediate: true, deps }),
      { initialProps: { deps } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);

    // Update dependencies
    await act(async () => {
      rerender({ deps: [2] });
      await Promise.resolve();
    });

    expect(asyncFn).toHaveBeenCalledTimes(2);
  });
});
