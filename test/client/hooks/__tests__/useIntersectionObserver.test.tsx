import { renderHook } from '@testing-library/react-hooks';
import { useIntersectionObserver } from '../../../../src/client/hooks/useIntersectionObserver';

describe('useIntersectionObserver', () => {
  let mockIntersectionObserver: jest.Mock;
  let mockDisconnect: jest.Mock;
  let mockObserve: jest.Mock;
  let mockUnobserve: jest.Mock;
  let intersectionCallback: IntersectionObserverCallback;

  beforeEach(() => {
    mockDisconnect = jest.fn();
    mockObserve = jest.fn();
    mockUnobserve = jest.fn();

    mockIntersectionObserver = jest.fn((callback) => {
      intersectionCallback = callback;
      return {
        disconnect: mockDisconnect,
        observe: mockObserve,
        unobserve: mockUnobserve,
      };
    });

    window.IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default options', () => {
    const { result } = renderHook(() => useIntersectionObserver<HTMLDivElement>());
    const [ref, isVisible] = result.current;

    expect(ref.current).toBeNull();
    expect(isVisible).toBe(false);
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0,
        root: null,
        rootMargin: '0px',
      },
    );
  });

  it('should accept custom options', () => {
    const options = {
      threshold: 0.5,
      root: document.createElement('div'),
      rootMargin: '10px',
    };

    renderHook(() => useIntersectionObserver<HTMLDivElement>(options));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      options,
    );
  });

  it('should handle intersection changes', () => {
    const { result } = renderHook(() => useIntersectionObserver<HTMLDivElement>());
    const [ref] = result.current;

    // Simulate element being set
    const element = document.createElement('div');
    Object.defineProperty(ref, 'current', {
      value: element,
      writable: true,
    });

    // Simulate intersection
    intersectionCallback(
      [createMockEntry(true, element)],
      {} as IntersectionObserver,
    );

    expect(result.current[1]).toBe(true);

    // Simulate no intersection
    intersectionCallback(
      [createMockEntry(false, element)],
      {} as IntersectionObserver,
    );

    expect(result.current[1]).toBe(false);
  });

  it('should handle freezeOnceVisible option', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver<HTMLDivElement>({ freezeOnceVisible: true }),
    );
    const [ref] = result.current;

    // Simulate element being set
    const element = document.createElement('div');
    Object.defineProperty(ref, 'current', {
      value: element,
      writable: true,
    });

    // Simulate intersection
    intersectionCallback(
      [createMockEntry(true, element)],
      {} as IntersectionObserver,
    );

    expect(result.current[1]).toBe(true);
    expect(mockUnobserve).toHaveBeenCalledWith(element);

    // Simulate no intersection - should still be true due to freezing
    intersectionCallback(
      [createMockEntry(false, element)],
      {} as IntersectionObserver,
    );

    expect(result.current[1]).toBe(true);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useIntersectionObserver<HTMLDivElement>());
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should handle onVisibilityChange callback', () => {
    const onVisibilityChange = jest.fn();
    const { result } = renderHook(() =>
      useIntersectionObserver<HTMLDivElement>({ onVisibilityChange }),
    );
    const [ref] = result.current;

    const element = document.createElement('div');
    Object.defineProperty(ref, 'current', {
      value: element,
      writable: true,
    });

    intersectionCallback(
      [createMockEntry(true, element)],
      {} as IntersectionObserver,
    );

    expect(onVisibilityChange).toHaveBeenCalledWith(true);

    intersectionCallback(
      [createMockEntry(false, element)],
      {} as IntersectionObserver,
    );

    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });
});

function createMockEntry(isIntersecting: boolean, target: Element): IntersectionObserverEntry {
  return {
    isIntersecting,
    target,
    boundingClientRect: new DOMRect(),
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: new DOMRect(),
    rootBounds: new DOMRect(),
    time: Date.now(),
  };
}
