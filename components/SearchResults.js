import React, { Component } from 'react';
import { View, FlatList, Text, Image, StyleSheet } from 'react-native';
import { getThemeColors } from '../theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { useGlobalStyles } from '../hooks/useGlobalStyles';

const SearchResults = ({ productos }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { spacing, typography, borders } = colors;
  const globalStyles = useGlobalStyles(colors);

  const styles = StyleSheet.create({
    searchContainer: {
      ...globalStyles.searchInput,
      width: '90%',
      height: 40,
    },
    searchListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchImage: {
      width: 60,
      height: 60,
      borderRadius: borders.radius.sm,
      marginRight: spacing.md,
    },
    searchTextContainer: {
      flex: 1,
    },
    searchTextName: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.text.primary,
    },
    searchSubTitle: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
    },
    searchTextCategory: {
      fontSize: typography.sizes.sm,
      color: colors.text.primary,
    },
    searchTextPrice: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.primary,
    },
    noResultsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    noResultsText: {
      fontSize: typography.sizes.md,
      color: colors.text.secondary,
    },
  });

  return (
    <View style={styles.searchContainer}>
      {productos.length > 0 ? (
        <FlatList
          data={productos}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.searchListItem}>
              <Image source={{ uri: item.imagen }} style={styles.searchImage} />
              <View style={styles.searchTextContainer}>
                <Text style={styles.searchTextName}>{item.nombre}</Text>
                <Text style={styles.searchSubTitle}>Categoría</Text>
                <Text style={styles.searchTextCategory}>{item.categoria}</Text>
                <Text style={styles.searchTextPrice}>RD${item.precio}.00</Text>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No se encontraron resultados.</Text>
        </View>
      )}
    </View>
  );
};

export default SearchResults;
