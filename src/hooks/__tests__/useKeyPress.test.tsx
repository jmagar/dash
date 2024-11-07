import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useKeyPress, isEnter, withCtrl } from '../useKeyPress';

interface TestComponentProps {
  keyFilter: string | ((e: KeyboardEvent) => boolean);
  onKeyPress: (e: KeyboardEvent) => void;
  options?: Parameters<typeof useKeyPress>[2];
}

const TestComponent: React.FC<TestComponentProps> = ({ keyFilter, onKeyPress, options }) => {
  useKeyPress(keyFilter, onKeyPress, options);
  return <div data-testid="test-element">Press a key</div>;
};

describe('useKeyPress', () => {
  it('should handle key press with string filter', () => {
    const onKeyPress = jest.fn();
    render(<TestComponent keyFilter="Enter" onKeyPress={onKeyPress} />);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onKeyPress).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Space' });
    expect(onKeyPress).toHaveBeenCalledTimes(1);
  });

  it('should handle key press with function filter', () => {
    const onKeyPress = jest.fn();
    render(<TestComponent keyFilter={isEnter} onKeyPress={onKeyPress} />);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onKeyPress).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Space' });
    expect(onKeyPress).toHaveBeenCalledTimes(1);
  });

  it('should handle modifier keys', () => {
    const onKeyPress = jest.fn();
    render(<TestComponent keyFilter={withCtrl('s')} onKeyPress={onKeyPress} />);

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(onKeyPress).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 's', ctrlKey: false });
    expect(onKeyPress).toHaveBeenCalledTimes(1);
  });

  it('should respect preventDefault option', () => {
    const onKeyPress = jest.fn();
    const preventDefault = jest.fn();

    render(
      <TestComponent
        keyFilter="Enter"
        onKeyPress={onKeyPress}
        options={{ preventDefault: true }}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter', preventDefault });
    expect(preventDefault).toHaveBeenCalled();
  });

  it('should respect stopPropagation option', () => {
    const onKeyPress = jest.fn();
    const stopPropagation = jest.fn();

    render(
      <TestComponent
        keyFilter="Enter"
        onKeyPress={onKeyPress}
        options={{ stopPropagation: true }}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter', stopPropagation });
    expect(stopPropagation).toHaveBeenCalled();
  });

  it('should handle different event types', () => {
    const onKeyPress = jest.fn();

    render(
      <TestComponent
        keyFilter="Enter"
        onKeyPress={onKeyPress}
        options={{ event: 'keyup' }}
      />
    );

    fireEvent.keyUp(window, { key: 'Enter' });
    expect(onKeyPress).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onKeyPress).toHaveBeenCalledTimes(1);
  });

  it('should handle custom target', () => {
    const onKeyPress = jest.fn();
    const { getByTestId } = render(
      <TestComponent
        keyFilter="Enter"
        onKeyPress={onKeyPress}
        options={{ target: document.body }}
      />
    );

    const element = getByTestId('test-element');
    fireEvent.keyDown(element, { key: 'Enter' });
    expect(onKeyPress).toHaveBeenCalledTimes(1);
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListener = jest.spyOn(window, 'removeEventListener');
    const onKeyPress = jest.fn();

    const { unmount } = render(
      <TestComponent keyFilter="Enter" onKeyPress={onKeyPress} />
    );

    unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });
});
