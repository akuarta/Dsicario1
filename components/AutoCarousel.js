import React, { useEffect, useRef, useState } from 'react';
import { FlatList, View, Dimensions, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing } from '../theme/theme';

const { width } = Dimensions.get('window');
// Calculate card width. On web we might have a wider container, but for mobile it's screen width.
// We subtract some margin to let it peek if desired, or just use full width minus standard padding.
const CARD_WIDTH = width - (Platform.OS === 'web' && width > 600 ? width * 0.4 : spacing.md * 2);

const AutoCarousel = ({ data, renderItem, autoPlayInterval = 4000 }) => {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  useEffect(() => {
    if (!data || data.length === 0) return;
    
    // Auto-scroll logic
    const intervalId = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= data.length) {
        nextIndex = 0;
      }
      
      setCurrentIndex(nextIndex);
      
      // Safety check just in case FlatList hasn't mounted
      try {
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
      } catch (e) {
        // Ignore scroll errors on unmounted/unmeasured lists
      }
    }, autoPlayInterval);

    return () => clearInterval(intervalId);
  }, [currentIndex, data, autoPlayInterval]);

  const handleScrollEnd = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentIndex(index);
  };

  const onScrollToIndexFailed = (error) => {
    const offset = error.averageItemLength * error.index;
    flatListRef.current?.scrollToOffset({ offset, animated: true });
  };

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={Platform.OS !== 'web'} // Paging is better on native
        snapToInterval={Platform.OS === 'web' ? CARD_WIDTH + spacing.md : undefined}
        decelerationRate="fast"
        renderItem={({ item, index }) => (
          <View style={{ width: CARD_WIDTH, marginRight: spacing.md, paddingLeft: index === 0 ? spacing.md : 0 }}>
            {renderItem({ item, index })}
          </View>
        )}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollToIndexFailed={onScrollToIndexFailed}
      />
      
      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {data.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === currentIndex ? colors.primary : colors.border },
              index === currentIndex && styles.activeDot
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  activeDot: {
    width: 16,
    height: 6,
  }
});

export default AutoCarousel;
