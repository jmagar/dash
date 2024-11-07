import React from 'react';
import { render, act } from '@testing-library/react';
import { useIntersectionObserver } from '../useIntersectionObserver';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
const mockDisconnect = jest.fn();
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();

beforeEach(() => {
  // Reset all mocks
  mockIntersectionObserver.mockClear();
  mockDisconnect.mockClear();
  mockObserve.mockClear();
  mockUnobserve.mockClear();

  // Setup IntersectionObserver mock
  mockIntersectionObserver.mockImplementation((callback) => ({
    disconnect: mockDisconnect,
    observe: mockObserve,
    unobserve: mockUnobserve,
    takeRecords: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [0],
  }));

  window.IntersectionObserver = mockIntersectionObserver;
});

const TestComponent: React.FC<{ onVisibilityChange?: (visible: boolean) => void }> = ({
  onVisibilityChange
}) => {
  const [ref, isVisible] = useIntersectionObserver({
    onVisibilityChange,
  });

  return (
    <div ref={ref} data-testid="test-element">
      {isVisible ? 'Visible' : 'Not visible'}
    </div>
  );
};

describe('useIntersectionObserver', () => {
  it('should initialize with isVisible as false', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test-element')).toHaveTextContent('Not visible');
  });

  it('should create an IntersectionObserver with default options', () => {
    render(<TestComponent />);
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0,
        root: null,
        rootMargin: '0px',
      }
    );
  });

  it('should observe the element when mounted', () => {
    render(<TestComponent />);
    expect(mockObserve).toHaveBeenCalled();
  });

  it('should disconnect the observer when unmounted', () => {
    const { unmount } = render(<TestComponent />);
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should update isVisible when intersection changes', () => {
    const { getByTestId } = render(<TestComponent />);

    // Simulate intersection
    act(() => {
      const [[callback]] = mockIntersectionObserver.mock.calls;
      callback([{ isIntersecting: true }]);
    });

    expect(getByTestId('test-element')).toHaveTextContent('Visible');

    // Simulate leaving intersection
    act(() => {
      const [[callback]] = mockIntersectionObserver.mock.calls;
      callback([{ isIntersecting: false }]);
    });

    expect(getByTestId('test-element')).toHaveTextContent('Not visible');
  });

  it('should call onVisibilityChange when visibility changes', () => {
    const onVisibilityChange = jest.fn();
    render(<TestComponent onVisibilityChange={onVisibilityChange} />);

    // Simulate intersection
    act(() => {
      const [[callback]] = mockIntersectionObserver.mock.calls;
      callback([{ isIntersecting: true }]);
    });

    expect(onVisibilityChange).toHaveBeenCalledWith(true);

    // Simulate leaving intersection
    act(() => {
      const [[callback]] = mockIntersectionObserver.mock.calls;
      callback([{ isIntersecting: false }]);
    });

    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });

  it('should freeze observations when freezeOnceVisible is true', () => {
    const TestComponentWithFreeze: React.FC = () => {
      const [ref, isVisible] = useIntersectionObserver({
        freezeOnceVisible: true,
      });

      return (
        <div ref={ref} data-testid="test-element">
          {isVisible ? 'Visible' : 'Not visible'}
        </div>
      );
    };

    const { getByTestId } = render(<TestComponentWithFreeze />);

    // Simulate intersection
    act(() => {
      const [[callback]] = mockIntersectionObserver.mock.calls;
      callback([{ isIntersecting: true }]);
    });

    expect(getByTestId('test-element')).toHaveTextContent('Visible');
    expect(mockUnobserve).toHaveBeenCalled();

    // Simulate leaving intersection
    act(() => {
      const [[callback]] = mockIntersectionObserver.mock.calls;
      callback([{ isIntersecting: false }]);
    });

    // Should still be visible due to freezing
    expect(getByTestId('test-element')).toHaveTextContent('Visible');
  });
});
