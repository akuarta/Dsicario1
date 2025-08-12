import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FadeLoading } from 'react-native-fade-loading';
import theme from '../theme';

const { colors, spacing, borders, dimensions } = theme;

const ProductPlaceholder = ({ itemCount = 6, mode = 'grid' }) => {
  const renderGridPlaceholderItem = (index) => (
    <View key={index} style={styles.gridPlaceholderItem}>
      {/* Imagen del producto */}
      <FadeLoading
        style={styles.productImagePlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1200}
      />
      
      {/* Badge de rating */}
      <FadeLoading
        style={styles.ratingBadgePlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1200}
      />
      
      {/* Categoría */}
      <FadeLoading
        style={styles.categoryPlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1200}
      />
      
      {/* Nombre del producto */}
      <FadeLoading
        style={styles.productNamePlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1200}
      />
      
      {/* Subcategoría */}
      <FadeLoading
        style={styles.subcategoryPlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1200}
      />
      
      {/* Precio */}
      <FadeLoading
        style={styles.pricePlaceholder}
        primaryColor={colors.surface}
        secondaryColor={colors.border}
        animated={true}
        duration={1200}
      />
      
      {/* Badges */}
      <View style={styles.badgesContainer}>
        <FadeLoading
          style={styles.badgePlaceholder}
          primaryColor={colors.surface}
          secondaryColor={colors.border}
          animated={true}
          duration={1200}
        />
        <FadeLoading
          style={[styles.badgePlaceholder, styles.badgePlaceholderSecond]}
          primaryColor={colors.surface}
          secondaryColor={colors.border}
          animated={true}
          duration={1200}
        />
      </View>
    </View>
  );

  const renderSectionPlaceholder = () => (
    <View style={styles.sectionContainer}>
      {/* Header de sección */}
      <View style={styles.sectionHeaderPlaceholder}>
        <FadeLoading
          style={styles.sectionTitlePlaceholder}
          primaryColor={colors.surface}
          secondaryColor={colors.border}
          animated={true}
          duration={1200}
        />
        <FadeLoading
          style={styles.seeMoreButtonPlaceholder}
          primaryColor={colors.surface}
          secondaryColor={colors.border}
          animated={true}
          duration={1200}
        />
      </View>
      
      {/* Lista horizontal de productos */}
      <View style={styles.horizontalPlaceholderContainer}>
        {Array.from({ length: 5 }, (_, index) => (
          <View key={index} style={styles.horizontalPlaceholderItem}>
            <FadeLoading
              style={styles.horizontalImagePlaceholder}
              primaryColor={colors.surface}
              secondaryColor={colors.border}
              animated={true}
              duration={1200}
            />
            <FadeLoading
              style={styles.horizontalNamePlaceholder}
              primaryColor={colors.surface}
              secondaryColor={colors.border}
              animated={true}
              duration={1200}
            />
            <FadeLoading
              style={styles.horizontalPricePlaceholder}
              primaryColor={colors.surface}
              secondaryColor={colors.border}
              animated={true}
              duration={1200}
            />
          </View>
        ))}
      </View>
    </View>
  );

  if (mode === 'inicio') {
    return (
      <View style={styles.container}>
        {/* Placeholder de la barra de búsqueda */}
        <View style={styles.searchBarContainer}>
          <FadeLoading
            style={styles.searchBarPlaceholder}
            primaryColor={colors.surface}
            secondaryColor={colors.border}
            animated={true}
            duration={1200}
          />
        </View>
        
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index}>
            {renderSectionPlaceholder()}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Placeholder de la barra de búsqueda para modo grid */}
      <View style={styles.searchBarContainer}>
        <FadeLoading
          style={styles.searchBarPlaceholder}
          primaryColor={colors.surface}
          secondaryColor={colors.border}
          animated={true}
          duration={1200}
        />
      </View>
      
      <View style={styles.grid}>
        {Array.from({ length: itemCount }, (_, index) => renderGridPlaceholderItem(index))}
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
  
  // Search Bar Placeholder
  searchBarContainer: {
    marginBottom: spacing.md,
  },
  
  searchBarPlaceholder: {
    height: 48,
    borderRadius: borders.radius.lg,
    marginHorizontal: spacing.xs,
  },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  // Grid Layout Placeholders
  gridPlaceholderItem: {
    width: (dimensions.window.width - (spacing.md * 3)) / 2,
    backgroundColor: colors.background,
    borderRadius: borders.radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
    position: 'relative',
  },
  
  productImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: borders.radius.md,
    marginBottom: spacing.sm,
  },
  
  ratingBadgePlaceholder: {
    position: 'absolute',
    top: spacing.sm + spacing.xs,
    right: spacing.sm + spacing.xs,
    width: 30,
    height: 16,
    borderRadius: borders.radius.sm,
  },
  
  categoryPlaceholder: {
    width: '70%',
    height: 12,
    borderRadius: borders.radius.sm,
    marginBottom: spacing.xs,
  },
  
  productNamePlaceholder: {
    width: '85%',
    height: 16,
    borderRadius: borders.radius.sm,
    marginBottom: spacing.xs,
  },
  
  subcategoryPlaceholder: {
    width: '60%',
    height: 12,
    borderRadius: borders.radius.sm,
    marginBottom: spacing.xs,
  },
  
  pricePlaceholder: {
    width: '50%',
    height: 18,
    borderRadius: borders.radius.sm,
    marginBottom: spacing.xs,
  },
  
  badgesContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  
  badgePlaceholder: {
    width: 40,
    height: 14,
    borderRadius: borders.radius.round,
    marginRight: spacing.xs,
  },
  
  badgePlaceholderSecond: {
    width: 35,
  },

  // Section Layout Placeholders (para modo inicio)
  sectionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borders.radius.lg,
    marginHorizontal: 12,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    ...theme.shadows.small,
  },
  
  sectionHeaderPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  
  sectionTitlePlaceholder: {
    width: 120,
    height: 20,
    borderRadius: borders.radius.sm,
  },
  
  seeMoreButtonPlaceholder: {
    width: 40,
    height: 24,
    borderRadius: 16,
  },
  
  horizontalPlaceholderContainer: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  
  horizontalPlaceholderItem: {
    width: 160,
    marginRight: spacing.md,
    alignItems: 'center',
  },
  
  horizontalImagePlaceholder: {
    width: 140,
    height: 100,
    borderRadius: borders.radius.md,
    marginBottom: spacing.sm,
  },
  
  horizontalNamePlaceholder: {
    width: '90%',
    height: 16,
    borderRadius: borders.radius.sm,
    marginBottom: spacing.xs,
  },
  
  horizontalPricePlaceholder: {
    width: '60%',
    height: 14,
    borderRadius: borders.radius.sm,
  },
});

export default ProductPlaceholder;