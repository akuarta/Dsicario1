import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FadeLoading } from 'react-native-fade-loading';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const ProductPlaceholder = ({ itemCount = 6, mode = 'grid' }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { spacing, borders, dimensions } = colors;

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

    gridPlaceholderItem: {
      width: dimensions.width / 2 - spacing.md * 2,
      marginBottom: spacing.md,
      backgroundColor: colors.background,
      borderRadius: borders.radius.md,
      padding: spacing.sm,
      marginHorizontal: spacing.xs,
    },

    productImagePlaceholder: {
      width: '100%',
      height: 150,
      borderRadius: borders.radius.sm,
      marginBottom: spacing.sm,
    },

    ratingBadgePlaceholder: {
      width: 50,
      height: 16,
      borderRadius: borders.radius.xs,
      marginBottom: spacing.xs,
    },

    categoryPlaceholder: {
      width: '70%',
      height: 14,
      borderRadius: borders.radius.xs,
      marginBottom: spacing.xs,
    },

    productNamePlaceholder: {
      width: '90%',
      height: 16,
      borderRadius: borders.radius.xs,
      marginBottom: spacing.xs,
    },

    subcategoryPlaceholder: {
      width: '60%',
      height: 12,
      borderRadius: borders.radius.xs,
      marginBottom: spacing.sm,
    },

    pricePlaceholder: {
      width: '40%',
      height: 18,
      borderRadius: borders.radius.xs,
    },

    badgesContainer: {
      flexDirection: 'row',
      marginTop: spacing.sm,
    },

    badgePlaceholder: {
      width: 40,
      height: 16,
      borderRadius: borders.radius.xs,
      marginRight: spacing.xs,
    },

    badgePlaceholderSecond: {
      width: 60,
    },

    // Section Placeholder
    sectionContainer: {
      marginBottom: spacing.xl,
    },

    sectionHeaderPlaceholder: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },

    sectionTitlePlaceholder: {
      width: '50%',
      height: 20,
      borderRadius: borders.radius.xs,
    },

    seeMoreButtonPlaceholder: {
      width: '20%',
      height: 16,
      borderRadius: borders.radius.xs,
    },

    horizontalPlaceholderContainer: {
      flexDirection: 'row',
    },

    horizontalPlaceholderItem: {
      width: 120,
      marginRight: spacing.md,
      backgroundColor: colors.background,
      borderRadius: borders.radius.md,
      padding: spacing.sm,
    },

    horizontalImagePlaceholder: {
      width: '100%',
      height: 100,
      borderRadius: borders.radius.sm,
      marginBottom: spacing.sm,
    },

    horizontalNamePlaceholder: {
      width: '80%',
      height: 14,
      borderRadius: borders.radius.xs,
      marginBottom: spacing.xs,
    },

    horizontalPricePlaceholder: {
      width: '50%',
      height: 16,
      borderRadius: borders.radius.xs,
    },
  });
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


  


export default ProductPlaceholder;