import { useEffect, useMemo, useState } from 'react';

interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

interface UseVirtualScrollReturn {
  virtualItems: { index: number; offsetTop: number }[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  scrollTo: (index: number) => void;
}

export function useVirtualScroll({
  itemCount,
  itemHeight,
  overscan = 3,
  containerHeight,
}: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate the range of visible items
  const { virtualItems, startIndex, endIndex, totalHeight } = useMemo(() => {
    const rangeStart = Math.floor(scrollTop / itemHeight);
    const rangeEnd = Math.min(
      itemCount - 1, // don't render past the end
      Math.floor((scrollTop + containerHeight) / itemHeight)
    );

    // Add overscan items before and after
    const start = Math.max(0, rangeStart - overscan);
    const end = Math.min(itemCount - 1, rangeEnd + overscan);

    const virtualItems = [];
    for (let i = start; i <= end; i++) {
      virtualItems.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return {
      virtualItems,
      startIndex: start,
      endIndex: end,
      totalHeight: itemCount * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  // Update scroll position when container is scrolled
  const onScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    setScrollTop(target.scrollTop);
  };

  useEffect(() => {
    const container = document.querySelector('.virtual-scroll-container');
    if (container) {
      container.addEventListener('scroll', onScroll);
      return () => container.removeEventListener('scroll', onScroll);
    }
  }, []);

  // Function to scroll to a specific item
  const scrollTo = (index: number) => {
    const container = document.querySelector('.virtual-scroll-container');
    if (container) {
      container.scrollTop = index * itemHeight;
    }
  };

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollTo,
  };
}
