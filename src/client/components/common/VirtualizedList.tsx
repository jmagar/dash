import React from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (props: ListChildComponentProps<T>) => React.ReactElement;
  overscanCount?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  overscanCount = 5
}: VirtualizedListProps<T>): React.ReactElement {
  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          height={height}
          width={width}
          itemCount={items.length}
          itemSize={itemHeight}
          overscanCount={overscanCount}
        >
          {renderItem}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
} 