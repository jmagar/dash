import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AnyAction } from '@reduxjs/toolkit';

const showLoading = (): AnyAction => ({
  type: 'ui/showLoading',
});

const hideLoading = (): AnyAction => ({
  type: 'ui/hideLoading',
});

export function useLoadingOverlay() {
  const dispatch = useDispatch();

  const showLoadingOverlay = useCallback((): void => {
    dispatch(showLoading());
  }, [dispatch]);

  const hideLoadingOverlay = useCallback((): void => {
    dispatch(hideLoading());
  }, [dispatch]);

  return {
    showLoading: showLoadingOverlay,
    hideLoading: hideLoadingOverlay,
  };
}
