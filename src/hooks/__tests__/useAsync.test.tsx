import { renderHook, act } from '@testing-library/react-hooks';

import { useAsync } from '../useAsync';

describe('useAsync hook', () => {
  it('should handle successful async function', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue('test data');

    const { result } = renderHook(() =>
      useAsync(() => mockAsyncFunction()),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('test data');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle failed async function', async () => {
    const mockError = new Error('Test error');
    const mockAsyncFunction = jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useAsync(() => mockAsyncFunction()),
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Test error');
  });

  it('should support immediate option', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue('immediate data');

    const { result } = renderHook(() =>
      useAsync(() => mockAsyncFunction(), { immediate: true }),
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.data).toBe('immediate data');
    expect(result.current.loading).toBe(false);
  });
});
