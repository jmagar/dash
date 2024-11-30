import '@testing-library/jest-dom';
import { RenderHookResult } from '@testing-library/react-hooks';
import type { RootState } from '../client/store/types';
import type { Store } from '@reduxjs/toolkit';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveStyle(style: Record<string, unknown>): R;
      toHaveReduxState(partial: Partial<RootState>): R;
    }
  }
}

export interface TestWrapper {
  children: React.ReactNode;
}

export type RenderHookResponse<TProps, TResult> = RenderHookResult<TProps, TResult>;

export interface MockStore extends Store {
  getState(): unknown;
  subscribe(): void;
  dispatch: jest.Mock;
}
