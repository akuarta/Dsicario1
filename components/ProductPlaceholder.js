import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FadeLoading } from 'react-native-fade-loading';
import theme from '../theme';

const { colors, spacing, borders, dimensions } = theme;

const ProductPlaceholder = ({ itemCount = 6 }) => {
  const renderPlaceholderItem = (index) => (
    <View key={index} style={styles.placeholderItem}>
      <FadeLoading
        style={styles.imagePlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1000}
      />
      <FadeLoading
        style={styles.titlePlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1000}
      />
      <FadeLoading
        style={styles.subtitlePlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1000}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {Array.from({ length: itemCount }, (_, index) => renderPlaceholderItem(index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  placeholderItem: {
    width: (dimensions.window.width - (spacing.md * 3)) / 2,
    backgroundColor: colors.background,
    borderRadius: borders.radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  
  imagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: borders.radius.md,
    marginBottom: spacing.sm,
  },
  
  titlePlaceholder: {
    width: '80%',
    height: 16,
    borderRadius: borders.radius.sm,
    marginBottom: spacing.xs,
  },
  
  subtitlePlaceholder: {
    width: '60%',
    height: 12,
    borderRadius: borders.radius.sm,
  },
});

export default ProductPlaceholder;