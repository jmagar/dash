import { useCallback, useMemo } from 'react';
import type { FileInfo } from '../../../../types/files';
import type { FileSortState } from '../types';

export function useFileSort(files: FileInfo[], initialSort: FileSortState) {
  const sortFiles = useCallback((files: FileInfo[], { field, direction }: FileSortState) => {
    return [...files].sort((a, b) => {
      // Always sort directories first
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;

      // Then sort by the specified field
      const aValue = a[field];
      const bValue = b[field];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Handle date strings (like modified field)
        if (field === 'modified') {
          const aDate = new Date(aValue).getTime();
          const bDate = new Date(bValue).getTime();
          return direction === 'asc' ? aDate - bDate : bDate - aDate;
        }
        return direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  }, []);

  const sortedFiles = useMemo(() => sortFiles(files, initialSort), [files, initialSort, sortFiles]);

  const toggleSort = useCallback((field: keyof FileInfo) => {
    return {
      field,
      direction: initialSort.field === field && initialSort.direction === 'asc' ? 'desc' : 'asc',
    };
  }, [initialSort]);

  return {
    sortedFiles,
    toggleSort,
  };
} 