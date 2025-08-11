import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import theme from '../theme';

const { spacing } = theme;

/**
 * Optimized FlatList Component with performance enhancements
 * Includes memoization, optimized rendering, and performance props
 */
const OptimizedFlatList = memo(({
  data,
  renderItem,
  keyExtractor,
  numColumns = 1,
  horizontal = false,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  contentContainerStyle,
  style,
  onEndReached,
  onEndReachedThreshold = 0.5,
  refreshControl,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  ItemSeparatorComponent,
  getItemLayout,
  initialNumToRender = 10,
  maxToRenderPerBatch = 5,
  windowSize = 10,
  removeClippedSubviews = true,
  updateCellsBatchingPeriod = 50,
  ...otherProps
}) => {
  // Memoize the key extractor to prevent recreation
  const memoizedKeyExtractor = useCallback((item, index) => {
    if (keyExtractor) {
      return keyExtractor(item, index);
    }
    return item.id?.toString() || index.toString();
  }, [keyExtractor]);

  // Memoize the render item function
  const memoizedRenderItem = useCallback((props) => {
    return renderItem(props);
  }, [renderItem]);

  // Memoize separator component
  const memoizedSeparator = useCallback(() => {
    if (ItemSeparatorComponent) {
      return <ItemSeparatorComponent />;
    }
    return <View style={styles.defaultSeparator} />;
  }, [ItemSeparatorComponent]);

  // Calculate item layout for better performance (if items have fixed height)
  const memoizedGetItemLayout = useMemo(() => {
    if (getItemLayout) {
      return getItemLayout;
    }
    
    // Default layout calculation for grid items
    if (numColumns > 1) {
      return (data, index) => ({
        length: 200, // Estimated item height
        offset: 200 * Math.floor(index / numColumns),
        index,
      });
    }
    
    return undefined;
  }, [getItemLayout, numColumns]);

  // Performance optimization props
  const performanceProps = useMemo(() => ({
    removeClippedSubviews,
    initialNumToRender,
    maxToRenderPerBatch,
    windowSize,
    updateCellsBatchingPeriod,
    getItemLayout: memoizedGetItemLayout,
  }), [
    removeClippedSubviews,
    initialNumToRender,
    maxToRenderPerBatch,
    windowSize,
    updateCellsBatchingPeriod,
    memoizedGetItemLayout,
  ]);

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={memoizedKeyExtractor}
      numColumns={numColumns}
      key={numColumns} // Force re-render when columns change
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      contentContainerStyle={[
        data?.length === 0 && styles.emptyContainer,
        contentContainerStyle
      ]}
      style={style}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      refreshControl={refreshControl}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ItemSeparatorComponent={numColumns === 1 ? memoizedSeparator : null}
      {...performanceProps}
      {...otherProps}
    />
  );
});

// Display name for debugging
OptimizedFlatList.displayName = 'OptimizedFlatList';

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
  },
  
  defaultSeparator: {
    height: spacing.sm,
  },
});

export default OptimizedFlatList;