/**
 * Optimized List Component
 * High-performance FlatList with proper bottom navigation spacing
 */

import React, { memo, useCallback } from 'react';
import {
  FlatList,
  FlatListProps,
  ListRenderItem,
  RefreshControl,
  View,
  StyleSheet,
} from 'react-native';
import { bottomNavHeight, spacing, colors } from '../../theme/uiTheme';

interface OptimizedListProps<T> extends Omit<FlatListProps<T>, 'contentContainerStyle'> {
  data: T[];
  renderItem: ListRenderItem<T>;
  onRefresh?: () => void;
  refreshing?: boolean;
  keyExtractor: (item: T, index: number) => string;
  extraBottomPadding?: number;
}

function OptimizedListComponent<T>({
  data,
  renderItem,
  onRefresh,
  refreshing = false,
  keyExtractor,
  extraBottomPadding = 0,
  ...props
}: OptimizedListProps<T>) {
  // Memoized render item to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback(renderItem, [renderItem]);

  // Content container style with proper bottom navigation spacing
  const contentContainerStyle = [
    styles.contentContainer,
    {
      paddingBottom: bottomNavHeight + spacing(3) + extraBottomPadding,
    },
    props.contentContainerStyle,
  ];

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={10}
      updateCellsBatchingPeriod={50}
      getItemLayout={undefined} // Let FlatList calculate automatically
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    flexGrow: 1,
  },
});

// Export memoized component to prevent unnecessary re-renders
export const OptimizedList = memo(OptimizedListComponent) as <T>(
  props: OptimizedListProps<T>
) => React.ReactElement;

export default OptimizedList;