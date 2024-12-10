import { useState, useCallback } from 'react';
import type { ViewMode, SortField, SortDirection, ViewState } from '../types';

interface UseFileViewOptions {
  initialMode?: ViewMode;
  initialSortField?: SortField;
  initialSortDirection?: SortDirection;
}

export function useFileView(options: UseFileViewOptions = {}) {
  const [viewState, setViewState] = useState<ViewState>({
    mode: options.initialMode || 'list',
    sortState: {
      field: options.initialSortField || 'name',
      direction: options.initialSortDirection || 'asc',
    },
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewState((prev: ViewState) => ({
      ...prev,
      mode,
    }));
  }, []);

  const setSortState = useCallback((field: SortField, direction: SortDirection) => {
    setViewState((prev: ViewState) => ({
      ...prev,
      sortState: { field, direction },
    }));
  }, []);

  return {
    viewState,
    setViewMode,
    setSortState,
  };
} 