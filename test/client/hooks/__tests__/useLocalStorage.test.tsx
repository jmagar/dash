import { renderHook, act } from '@testing-library/react-hooks';
import { useLocalStorage } from '../../../../src/client/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  const key = 'test-key';
  const initialValue = 'initial';

  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with the initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));
    const [storedValue] = result.current;

    expect(storedValue).toBe(initialValue);
    expect(localStorage.getItem(key)).toBe(JSON.stringify(initialValue));
  });

  it('should initialize with the stored value when it exists', () => {
    const storedValue = 'stored';
    localStorage.setItem(key, JSON.stringify(storedValue));

    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));
    const [value] = result.current;

    expect(value).toBe(storedValue);
  });

  it('should update the stored value when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));
    const newValue = 'new value';

    act(() => {
      const setValue = result.current[1];
      setValue(newValue);
    });

    const [storedValue] = result.current;
    expect(storedValue).toBe(newValue);
    expect(localStorage.getItem(key)).toBe(JSON.stringify(newValue));
  });

  it('should handle function updates', () => {
    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));

    act(() => {
      const setValue = result.current[1];
      setValue((prev: string) => prev + ' updated');
    });

    const [storedValue] = result.current;
    expect(storedValue).toBe(initialValue + ' updated');
    expect(localStorage.getItem(key)).toBe(JSON.stringify(initialValue + ' updated'));
  });

  it('should handle errors when reading from localStorage', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => { throw new Error('getItem error'); });

    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));
    const [storedValue] = result.current;

    expect(storedValue).toBe(initialValue);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    getItemSpy.mockRestore();
  });

  it('should handle errors when writing to localStorage', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw new Error('setItem error'); });

    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));

    act(() => {
      const setValue = result.current[1];
      setValue('new value');
    });

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('should handle invalid JSON in localStorage', () => {
    localStorage.setItem(key, 'invalid json');
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));
    const [storedValue] = result.current;

    expect(storedValue).toBe(initialValue);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should notify other instances of changes', () => {
    const { result: result1 } = renderHook(() => useLocalStorage<string>(key, initialValue));
    const { result: result2 } = renderHook(() => useLocalStorage<string>(key, initialValue));

    act(() => {
      const setValue = result1.current[1];
      setValue('new value');
      window.dispatchEvent(new Event('local-storage'));
    });

    const [storedValue1] = result1.current;
    const [storedValue2] = result2.current;

    expect(storedValue1).toBe('new value');
    expect(storedValue2).toBe('new value');
  });

  it('should handle complex objects', () => {
    interface TestObject {
      name: string;
      value: number;
    }

    const complexInitial: TestObject = { name: 'test', value: 42 };
    const { result } = renderHook(() => useLocalStorage<TestObject>('complex-key', complexInitial));

    const newValue: TestObject = { name: 'updated', value: 100 };
    act(() => {
      const setValue = result.current[1];
      setValue(newValue);
    });

    const [storedValue] = result.current;
    expect(storedValue).toEqual(newValue);
    expect(JSON.parse(localStorage.getItem('complex-key') || '')).toEqual(newValue);
  });

  it('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', null));

    expect(result.current[0]).toBeNull();

    act(() => {
      result.current[1]('value');
    });

    expect(result.current[0]).toBe('value');

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
  });

  it('should handle localStorage errors', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Storage quota exceeded');
    
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn().mockImplementation(() => {
      throw mockError;
    });

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('initial');
    expect(errorSpy).toHaveBeenCalled();

    Storage.prototype.setItem = originalSetItem;
    errorSpy.mockRestore();
  });
});
