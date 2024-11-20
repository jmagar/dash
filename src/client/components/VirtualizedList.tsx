import React from 'react';
import { Box } from '@mui/material';
import { useVirtualScroll } from '../hooks/useVirtualScroll';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight?: number;
  className?: string;
  overscan?: number;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight = 400,
  className = '',
  overscan = 3,
}: VirtualizedListProps<T>) {
  const {
    virtualItems,
    totalHeight,
    scrollTo,
  } = useVirtualScroll({
    itemCount: items.length,
    itemHeight,
    containerHeight,
    overscan,
  });

  return (
    <Box
      className={`virtual-scroll-container ${className}`}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        width: '100%',
      }}
    >
      <Box
        sx={{
          height: totalHeight,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map(({ index, offsetTop }) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              top: offsetTop,
              width: '100%',
              height: itemHeight,
            }}
          >
            {renderItem(items[index], index)}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
