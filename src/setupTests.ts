import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';
import type { MockStore } from './types/testing';

// Setup DOM environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// Mock Redux store
const mockDispatch = jest.fn();

const mockStore: MockStore = {
  getState: jest.fn(),
  subscribe: jest.fn(),
  dispatch: mockDispatch,
};

type SelectorFn<T> = (state: unknown) => T;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(<T>(selector: SelectorFn<T>) => selector(mockStore.getState())),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

// Reset mocks between tests
beforeEach(() => {
  mockDispatch.mockClear();
  (mockStore.getState as jest.Mock).mockClear();
  (mockStore.subscribe as jest.Mock).mockClear();
});

// Add custom matchers
expect.extend({
  toBeInTheDocument(received: unknown) {
    const pass = received !== null && received !== undefined;
    return {
      message: () =>
        `expected ${this.utils.printReceived(received)} ${pass ? 'not ' : ''}to be in the document`,
      pass,
    };
  },
  toHaveStyle(received: HTMLElement | null, style: Record<string, unknown>) {
    if (!received) {
      return {
        message: () => 'Element is null',
        pass: false,
      };
    }

    const computedStyle = window.getComputedStyle(received);
    const pass = Object.entries(style).every(
      ([key, value]) => computedStyle[key as keyof CSSStyleDeclaration] === value
    );

    return {
      message: () =>
        `expected ${this.utils.printReceived(received)} ${pass ? 'not ' : ''}to have style ${
          this.utils.printExpected(style)
        }`,
      pass,
    };
  },
});
