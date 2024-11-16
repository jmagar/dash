import { renderHook } from '@testing-library/react-hooks';
import { useKeyPress, isEnter, withCtrl } from '../../../../src/client/hooks/useKeyPress';

describe('useKeyPress', () => {
  let map: { [key: string]: (e: KeyboardEvent) => void } = {};

  beforeEach(() => {
    map = {};
    window.addEventListener = jest.fn((event, cb) => {
      map[event] = cb;
    });
    window.removeEventListener = jest.fn((event, cb) => {
      delete map[event];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should detect key press', () => {
    const { result } = renderHook(() => useKeyPress('Enter'));

    expect(result.current).toBe(false);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    map.keydown(event);
    expect(result.current).toBe(true);

    const upEvent = new KeyboardEvent('keyup', { key: 'Enter' });
    map.keyup(upEvent);
    expect(result.current).toBe(false);
  });

  it('should handle modifier keys', () => {
    const { result } = renderHook(() => useKeyPress(['Control', 'Enter']));

    expect(result.current).toBe(false);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
    });
    map.keydown(event);
    expect(result.current).toBe(true);

    const upEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      ctrlKey: false,
    });
    map.keyup(upEvent);
    expect(result.current).toBe(false);
  });

  it('should handle multiple keys', () => {
    const { result } = renderHook(() => useKeyPress(['Shift', 'Alt', 'Enter']));

    expect(result.current).toBe(false);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      altKey: true,
    });
    map.keydown(event);
    expect(result.current).toBe(true);
  });

  describe('key helpers', () => {
    it('isEnter should detect Enter key', () => {
      expect(isEnter({ key: 'Enter' } as KeyboardEvent)).toBe(true);
      expect(isEnter({ key: 'Space' } as KeyboardEvent)).toBe(false);
    });

    it('withCtrl should detect Ctrl key combination', () => {
      expect(withCtrl({ key: 'Enter', ctrlKey: true } as KeyboardEvent)).toBe(true);
      expect(withCtrl({ key: 'Enter', ctrlKey: false } as KeyboardEvent)).toBe(false);
    });
  });
});
