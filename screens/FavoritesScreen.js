import React, { useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList,
  TouchableOpacity,
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import ProductItem from '../components/ProductItem';
import { useFavorites } from '../contexts/FavoritesContext';
import { useGlobalStyles } from '../styles/globalStyles';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { showConfirm } from '../utils/showConfirm';

const FavoritesScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const globalStyles = useGlobalStyles(colors);
  const { favorites, removeFromFavorites, clearFavorites } = useFavorites();

  const handleProductPress = useCallback((product) => {
    navigation.navigate('ProductDetail', { product });
  }, [navigation]);

  const handleRemoveFavorite = useCallback((product) => {
    showConfirm(
      'Quitar de favoritos',
      `¿Quieres quitar "${product.nombre}" de tus favoritos?`,
      () => removeFromFavorites(product.id)
    );
  }, [removeFromFavorites]);

  const handleClearAll = useCallback(() => {
    showConfirm(
      'Vaciar favoritos',
      '¿Estás seguro de que quieres quitar todos los favoritos?',
      clearFavorites
    );
  }, [clearFavorites]);

  const renderFavoriteItem = useCallback(({ item }) => (
    <View style={styles.itemContainer}>
      <ProductItem 
        product={item} 
        onPress={handleProductPress} 
        showBadges 
        showRating 
      />
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => handleRemoveFavorite(item)}
      >
        <FontAwesome5 name="heart-broken" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  ), [handleProductPress, handleRemoveFavorite]);

  const renderEmptyFavorites = useCallback(() => (
    <View style={globalStyles.emptyContainer}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: spacing.md, left: spacing.md, padding: spacing.sm, zIndex: 10 }}>
         <FontAwesome5 name="arrow-left" size={20} color={colors.text.primary} />
      </TouchableOpacity>
      <FontAwesome5 name="heart" size={64} color={colors.text.light} />
      <Text style={globalStyles.emptyTitle}>Sin favoritos aún</Text>
      <Text style={globalStyles.emptyText}>
        Explora nuestros productos y marca tus favoritos para acceder rápidamente
      </Text>
      <TouchableOpacity 
        style={globalStyles.primaryButton}
        onPress={() => navigation.navigate('Explorar')}
      >
        <Text style={globalStyles.primaryButtonText}>Explorar Productos</Text>
      </TouchableOpacity>
    </View>
  ), [navigation]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.primary,
    },
    headerTitle: {
      ...typography.h5,
      color: colors.text.white,
    },
    clearButton: {
      padding: spacing.sm,
    },
    clearButtonText: {
      color: colors.text.white,
      fontSize: typography.sizes.sm,
    },
    listContainer: {
      padding: spacing.sm,
      paddingBottom: spacing.xxl + 20,
    },
    itemContainer: {
      position: 'relative',
    },
    removeButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm + 4,
      backgroundColor: colors.surface,
      padding: spacing.sm,
      borderRadius: borders.radius.round,
      zIndex: 10,
      ...shadows.small,
    },
  });

  if (favorites.length > 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10, paddingVertical: 5 }}>
              <FontAwesome5 name="arrow-left" size={20} color={colors.text.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {favorites.length} {favorites.length === 1 ? 'Producto' : 'Productos'} Favoritos
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Text style={styles.clearButtonText}>Limpiar todo</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderEmptyFavorites()}
    </SafeAreaView>
  );
};

export default FavoritesScreen;
