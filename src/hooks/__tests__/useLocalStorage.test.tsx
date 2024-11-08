import { renderHook, act } from '@testing-library/react';

import '@testing-library/jest-dom';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  const key = 'test-key';
  const initialValue = 'initial';

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should initialize with the initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));
    const [storedValue] = result.current;

    expect(storedValue).toBe(initialValue);
    expect(window.localStorage.getItem(key)).toBe(JSON.stringify(initialValue));
  });

  it('should initialize with the stored value when it exists', () => {
    const storedValue = 'stored';
    window.localStorage.setItem(key, JSON.stringify(storedValue));

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
    expect(window.localStorage.getItem(key)).toBe(JSON.stringify(newValue));
  });

  it('should handle function updates', () => {
    const { result } = renderHook(() => useLocalStorage<string>(key, initialValue));

    act(() => {
      const setValue = result.current[1];
      setValue((prev: string) => prev + ' updated');
    });

    const [storedValue] = result.current;
    expect(storedValue).toBe(initialValue + ' updated');
    expect(window.localStorage.getItem(key)).toBe(JSON.stringify(initialValue + ' updated'));
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
    window.localStorage.setItem(key, 'invalid json');
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
    expect(JSON.parse(window.localStorage.getItem('complex-key') || '')).toEqual(newValue);
  });
});
