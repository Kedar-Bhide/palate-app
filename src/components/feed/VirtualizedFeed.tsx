import React, { 
  useState, 
  useRef, 
  useCallback, 
  useMemo, 
  useEffect, 
  memo 
} from 'react';
import {
  View,
  FlatList,
  Dimensions,
  ViewToken,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { PostWithDetails } from '../../lib/database.types';
import { theme } from '../../theme';
import LoadingSkeleton from '../common/LoadingSkeleton';
import ErrorBoundary from '../common/ErrorBoundary';

export interface VirtualizedFeedProps<T = PostWithDetails> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  estimatedItemSize?: number;
  overscan?: number;
  keyExtractor?: (item: T, index: number) => string;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  contentContainerStyle?: any;
  scrollEventThrottle?: number;
  onScrollEndDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onMomentumScrollEnd?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  maintainVisibleContentPosition?: {
    minIndexForVisible: number;
    autoscrollToTopThreshold?: number;
  };
  removeClippedSubviews?: boolean;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  initialNumToRender?: number;
  windowSize?: number;
}

interface ItemHeightCache {
  [key: string]: number;
}

const VirtualizedFeed = <T extends PostWithDetails = PostWithDetails>({
  data,
  renderItem,
  onLoadMore,
  hasMore = false,
  loading = false,
  refreshing = false,
  onRefresh,
  estimatedItemSize = 400,
  keyExtractor,
  onViewableItemsChanged,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  contentContainerStyle,
  scrollEventThrottle = 16,
  onScrollEndDrag,
  onMomentumScrollEnd,
  maintainVisibleContentPosition,
  removeClippedSubviews = true,
  maxToRenderPerBatch = 5,
  updateCellsBatchingPeriod = 100,
  initialNumToRender = 10,
  windowSize = 10,
}: VirtualizedFeedProps<T>) => {
  const flatListRef = useRef<FlatList<T>>(null);
  const [itemHeightCache, setItemHeightCache] = useState<ItemHeightCache>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Performance tracking
  const renderCountRef = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const scrollVelocityRef = useRef(0);

  // Memoized key extractor
  const defaultKeyExtractor = useCallback((item: T, index: number) => {
    if (keyExtractor) {
      return keyExtractor(item, index);
    }
    return item.id || `item-${index}`;
  }, [keyExtractor]);

  // Cache item heights for better scroll performance
  const cacheItemHeight = useCallback((itemId: string, height: number) => {
    setItemHeightCache(prev => ({
      ...prev,
      [itemId]: height,
    }));
  }, []);

  // Get cached height for item
  const getCachedHeight = useCallback((itemId: string): number | undefined => {
    return itemHeightCache[itemId];
  }, [itemHeightCache]);

  // Optimized item renderer with height caching
  const renderOptimizedItem = useCallback(({ item, index }: ListRenderItemInfo<T>) => {
    const itemId = defaultKeyExtractor(item, index);
    renderCountRef.current += 1;

    return (
      <View
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height !== getCachedHeight(itemId)) {
            cacheItemHeight(itemId, height);
          }
        }}
      >
        {renderItem(item, index)}
      </View>
    );
  }, [renderItem, defaultKeyExtractor, getCachedHeight, cacheItemHeight]);

  // Optimized getItemLayout for known heights
  const getItemLayout = useCallback((data: ArrayLike<T> | null | undefined, index: number) => {
    if (!data || index < 0 || index >= data.length) {
      return {
        length: estimatedItemSize,
        offset: estimatedItemSize * index,
        index,
      };
    }

    const itemId = defaultKeyExtractor(data[index], index);
    const cachedHeight = getCachedHeight(itemId);
    
    if (cachedHeight !== undefined) {
      // Calculate offset based on cached heights
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const prevItemId = defaultKeyExtractor(data[i], i);
        const prevHeight = getCachedHeight(prevItemId);
        offset += prevHeight || estimatedItemSize;
      }
      
      return {
        length: cachedHeight,
        offset,
        index,
      };
    }

    // Fallback to estimated size
    return {
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    };
  }, [defaultKeyExtractor, getCachedHeight, estimatedItemSize]);

  // Handle scroll with performance optimizations
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const currentTime = Date.now();
    const timeDelta = currentTime - lastScrollTime.current;
    
    if (timeDelta > 0) {
      const offsetDelta = currentOffset - scrollOffset;
      scrollVelocityRef.current = offsetDelta / timeDelta;
    }
    
    setScrollOffset(currentOffset);
    lastScrollTime.current = currentTime;
  }, [scrollOffset]);

  // Load more with debouncing
  const handleLoadMore = useCallback(() => {
    if (loading || isLoadingMore || !hasMore || !onLoadMore) {
      return;
    }

    setIsLoadingMore(true);
    
    // Add small delay to prevent rapid fire requests
    setTimeout(() => {
      onLoadMore();
      setIsLoadingMore(false);
    }, 100);
  }, [loading, isLoadingMore, hasMore, onLoadMore]);

  // Optimized viewability config
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 250,
    waitForInteraction: false,
  }), []);

  // Handle viewable items changed with throttling
  const handleViewableItemsChanged = useCallback((info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
    onViewableItemsChanged?.(info);
  }, [onViewableItemsChanged]);

  // Memoized viewability callback
  const viewabilityConfigCallbackPairs = useMemo(() => {
    if (!onViewableItemsChanged) return undefined;
    
    return [{
      viewabilityConfig,
      onViewableItemsChanged: handleViewableItemsChanged,
    }];
  }, [viewabilityConfig, handleViewableItemsChanged]);

  // Loading footer component
  const renderFooter = useCallback(() => {
    if (ListFooterComponent) {
      return <>{ListFooterComponent}</>;
    }

    if (loading || isLoadingMore) {
      return (
        <View style={styles.footer}>
          <LoadingSkeleton
            type="post"
            count={1}
            animated={true}
          />
        </View>
      );
    }

    return null;
  }, [ListFooterComponent, loading, isLoadingMore]);

  // Empty component
  const renderEmpty = useCallback(() => {
    if (loading && data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <LoadingSkeleton
            type="feed"
            count={3}
            animated={true}
          />
        </View>
      );
    }

    if (ListEmptyComponent) {
      return <>{ListEmptyComponent}</>;
    }

    return null;
  }, [ListEmptyComponent, loading, data.length]);

  // Refresh control
  const refreshControl = useMemo(() => {
    if (!onRefresh) return undefined;

    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={theme.colors.primary}
        colors={[theme.colors.primary]}
        progressBackgroundColor={theme.colors.white}
        title="Pull to refresh..."
        titleColor={theme.colors.textSecondary}
      />
    );
  }, [refreshing, onRefresh]);

  // Performance monitoring effect
  useEffect(() => {
    const performanceTimer = setInterval(() => {
      const renderRate = renderCountRef.current;
      renderCountRef.current = 0;
      
      if (__DEV__ && renderRate > 20) {
        console.warn(`VirtualizedFeed: High render rate detected: ${renderRate} renders/second`);
      }
    }, 1000);

    return () => clearInterval(performanceTimer);
  }, []);

  // Memory cleanup effect
  useEffect(() => {
    return () => {
      // Clear height cache on unmount to free memory
      setItemHeightCache({});
    };
  }, []);

  const flatListProps = useMemo(() => ({
    ref: flatListRef,
    data,
    renderItem: renderOptimizedItem,
    keyExtractor: defaultKeyExtractor,
    getItemLayout: data.length > 0 ? getItemLayout : undefined,
    onEndReached: handleLoadMore,
    onEndReachedThreshold: 0.5,
    onScroll: handleScroll,
    scrollEventThrottle,
    ListHeaderComponent,
    ListFooterComponent: renderFooter,
    ListEmptyComponent: renderEmpty,
    refreshControl,
    removeClippedSubviews,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    initialNumToRender,
    windowSize,
    maintainVisibleContentPosition,
    viewabilityConfigCallbackPairs,
    onScrollEndDrag,
    onMomentumScrollEnd,
    contentContainerStyle: [
      styles.contentContainer,
      data.length === 0 && styles.emptyContentContainer,
      contentContainerStyle,
    ],
    style: styles.flatList,
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
  }), [
    data,
    renderOptimizedItem,
    defaultKeyExtractor,
    getItemLayout,
    handleLoadMore,
    handleScroll,
    scrollEventThrottle,
    ListHeaderComponent,
    renderFooter,
    renderEmpty,
    refreshControl,
    removeClippedSubviews,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    initialNumToRender,
    windowSize,
    maintainVisibleContentPosition,
    viewabilityConfigCallbackPairs,
    onScrollEndDrag,
    onMomentumScrollEnd,
    contentContainerStyle,
  ]);

  return (
    <ErrorBoundary level="component">
      <FlatList {...flatListProps} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: theme.spacing.sm,
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: theme.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
});

VirtualizedFeed.displayName = 'VirtualizedFeed';

export default memo(VirtualizedFeed) as typeof VirtualizedFeed;