import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  RefreshControl,
  Alert,
  FlatList,
  ScrollView
} from 'react-native';

import { FontAwesome5 } from '@expo/vector-icons';
import { useProducts } from '../contexts/AppContext';
import ProductItem from '../components/ProductItem';
import SearchBar from '../components/SearchBar';
import OptimizedFlatList from '../components/OptimizedFlatList';
import ProductPlaceholder from '../components/ProductPlaceholder';
import { useSearch } from '../hooks/useSearch';
import { useResponsive } from '../hooks/useResponsive';
import { advancedFilters, sortProducts } from '../utils/api';
import { findClosestProduct } from '../utils/stringUtils';
import { useThemeMode } from '../contexts/ThemeContext';
import theme from '../theme';
import { globalStyles } from '../styles/globalStyles';

const { colors, spacing, typography, borders } = theme;

const ProductListScreen = ({ navigation, route, mode }) => {
  const { darkMode } = useThemeMode();
  const { numColumns } = useResponsive();
  const { products, isLoading, error, refetchProducts, getCategoriesWithCounts, getProductStats } = useProducts();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedSort, setSelectedSort] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  // Sincronizar filtro con navegación
  const [selectedFilter, setSelectedFilter] = useState('all');
  useEffect(() => {
    if (route?.params?.filter) {
      setSelectedFilter(route.params.filter);
    } else {
      setSelectedFilter('all');
    }
  }, [route?.params?.filter]);

  // Search functionality
  const {
    searchTerm,
    setSearchTerm,
    filteredData: searchResults,
    clearSearch,
    hasActiveSearch
  } = useSearch(products);

  // Búsquedas recientes (persistentes en localStorage si está disponible)
  const [recentSearches, setRecentSearches] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('recentSearches');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Guardar búsqueda reciente si hay resultados
  useEffect(() => {
    if (searchTerm.trim() && searchResults.length > 0) {
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s !== searchTerm.trim());
        const updated = [searchTerm.trim(), ...filtered].slice(0, 5);
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem('recentSearches', JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    }
  }, [searchTerm, searchResults]);

  // Sugerencia de producto más parecido
  const closestProduct = (!hasActiveSearch && searchTerm.trim() && searchResults.length === 0)
    ? findClosestProduct(products, searchTerm)
    : null;

  // Aplicar filtro y orden
  const processedProducts = useMemo(() => {
    let result = hasActiveSearch ? searchResults : products;

    switch (selectedFilter) {
      case 'available':
        result = advancedFilters.disponibles(result);
        break;
      case 'offers':
        result = result.filter(p => p.enOferta || p.descuento > 0);
        break;
      case 'bestsellers':
        result = advancedFilters.masVendidos(result);
        break;
      case 'recommended':
        result = advancedFilters.recomendados(result);
        break;
      case 'house-specials':
        result = advancedFilters.delaCasa(result);
        break;
      case 'high-rated':
        result = advancedFilters.porRating(result, 4);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    result = sortProducts(result, selectedSort);
    return result;
  }, [products, searchResults, selectedFilter, selectedSort, hasActiveSearch]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchProducts();
    } catch (err) {
      showAlert('Error', 'No se pudieron actualizar los productos');
    } finally {
      setRefreshing(false);
    }
  }, [refetchProducts]);

  // Handle product press
  const handleProductPress = useCallback((product) => {
    navigation.navigate('ProductDetail', { product });
  }, [navigation]);

  // Render product item
  const isInicio = mode === 'inicio';
  const renderProductItem = useCallback(({ item }) => (
    <ProductItem 
      product={item}
      onPress={handleProductPress}
      showBadges={true}
      showRating={true}
      placeholderSource={isInicio ? { uri: 'https://picsum.photos/300/200?random=999' } : undefined}
    />
  ), [handleProductPress, isInicio]);

  // Render filter chip
  const renderFilterChip = useCallback((filter) => (
    <TouchableOpacity
      key={filter.key}
      style={[
        styles.filterChip,
        selectedFilter === filter.key && styles.activeFilterChip
      ]}
      onPress={() => setSelectedFilter(filter.key)}
      activeOpacity={0.7}
    >
      <FontAwesome5 
        name={filter.icon} 
        size={12} 
        color={selectedFilter === filter.key ? colors.text.white : colors.primary}
        style={styles.filterIcon}
      />
      <Text style={[
        styles.filterText,
        selectedFilter === filter.key && styles.activeFilterText
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  ), [selectedFilter]);

  // Filter options
  const filterOptions = [
    { key: 'all', label: 'Todos', icon: 'th-large' },
    { key: 'available', label: 'Disponibles', icon: 'check-circle' },
    { key: 'offers', label: 'Ofertas', icon: 'tag' },
    { key: 'bestsellers', label: 'Más Vendidos', icon: 'fire' },
    { key: 'recommended', label: 'Recomendados', icon: 'thumbs-up' },
    { key: 'house-specials', label: 'De la Casa', icon: 'home' },
    { key: 'high-rated', label: 'Mejor Valorados', icon: 'star' },
  ];

  // Sort options
  const sortOptions = [
    { key: 'popular', label: 'Popularidad', icon: 'fire' },
    { key: 'name', label: 'Nombre A-Z', icon: 'sort-alpha-down' },
    { key: 'price-asc', label: 'Precio ↑', icon: 'sort-numeric-down' },
    { key: 'price-desc', label: 'Precio ↓', icon: 'sort-numeric-up' },
    { key: 'rating', label: 'Valoración', icon: 'star' },
    { key: 'offers', label: 'Ofertas', icon: 'tag' },
  ];

  // Render header with stats
  const renderHeader = useCallback(() => {
    const stats = getProductStats();
    return (
      <View style={styles.header}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {processedProducts.length} productos
            {hasActiveSearch && ` de ${products.length}`}
          </Text>
          {stats.onOffer > 0 && (
            <Text style={styles.offersText}>
              {stats.onOffer} en oferta
            </Text>
          )}
        </View>

        {/* Filter Toggle */}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <FontAwesome5 
            name={showFilters ? 'chevron-up' : 'filter'} 
            size={16} 
            color={colors.primary} 
          />
          <Text style={styles.filterToggleText}>
            {showFilters ? 'Ocultar Filtros' : 'Filtros y Orden'}
          </Text>
        </TouchableOpacity>

        {/* Filters and Sort */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Filter Chips */}
            <View style={styles.filtersSection}>
              <Text style={styles.sectionTitle}>Filtrar por:</Text>
              <View style={styles.chipsContainer}>
                {filterOptions.map(renderFilterChip)}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filtersSection}>
              <Text style={styles.sectionTitle}>Ordenar por:</Text>
              <View style={styles.chipsContainer}>
                {sortOptions.map((sort) => (
                  <TouchableOpacity
                    key={sort.key}
                    style={[
                      styles.filterChip,
                      selectedSort === sort.key && styles.activeFilterChip
                    ]}
                    onPress={() => setSelectedSort(sort.key)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5 
                      name={sort.icon} 
                      size={12} 
                      color={selectedSort === sort.key ? colors.text.white : colors.primary}
                      style={styles.filterIcon}
                    />
                    <Text style={[
                      styles.filterText,
                      selectedSort === sort.key && styles.activeFilterText
                    ]}>
                      {sort.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }, [
    processedProducts.length, products.length, hasActiveSearch, getProductStats, showFilters,
    selectedFilter, selectedSort, filterOptions, sortOptions, renderFilterChip
  ]);

  // Render empty state
  const renderEmptyList = useCallback(() => (
    <View style={globalStyles.emptyContainer}>
      <FontAwesome5 
        name={hasActiveSearch ? 'search' : 'shopping-bag'} 
        size={48} 
        color={colors.text.light} 
      />
      <Text style={globalStyles.emptyText}>
        {hasActiveSearch 
          ? 'No se encontraron productos'
          : 'No hay productos disponibles'
        }
      </Text>
      {hasActiveSearch && (
        <TouchableOpacity 
          style={globalStyles.secondaryButton}
          onPress={clearSearch}
        >
          <Text style={globalStyles.secondaryButtonText}>Limpiar búsqueda</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [hasActiveSearch, clearSearch]);

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={globalStyles.errorContainer}>
        <FontAwesome5 name="exclamation-triangle" size={48} color={colors.error} />
        <Text style={globalStyles.errorText}>
          Error al cargar productos: {error}
        </Text>
        <TouchableOpacity style={globalStyles.primaryButton} onPress={refetchProducts}>
          <Text style={globalStyles.primaryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Render loading state
  if (isLoading && !refreshing) {
    return <ProductPlaceholder mode={mode} />;
  }

  // Agrupación dinámica por secciones solo para la pestaña "Inicio"
  // const isInicio = mode === 'inicio';
  if (isInicio) {
    // Definir las reglas de secciones dinámicas y su filtro
    const sectionRules = [
      {
        key: 'recommended',
        label: 'Recomendados',
        filter: (p) => p.recomendado,
        filterKey: 'recommended',
      },
      {
        key: 'offers',
        label: 'En oferta',
        filter: (p) => p.enOferta || p.descuento > 0,
        filterKey: 'offers',
      },
      {
        key: 'high-rated',
        label: 'Mejor Valorados',
        filter: (p) => p.rating >= 4,
        filterKey: 'high-rated',
      },
      {
        key: 'bestsellers',
        label: 'Más Vendidos',
        filter: (p) => p.masVendido,
        filterKey: 'bestsellers',
      },
      {
        key: 'house-specials',
        label: 'De la casa',
        filter: (p) => p.delaCasa,
        filterKey: 'house-specials',
      },
      // Puedes agregar más reglas aquí si tu API tiene más propiedades
    ];

    // Generar las secciones dinámicamente según los datos de la API
    const secciones = sectionRules.map(rule => ({
      key: rule.key,
      label: rule.label,
      productos: products.filter(rule.filter).slice(0, 5), // Limitar a 5 productos por sección
      filterKey: rule.filterKey,
    }));

    return (
      <SafeAreaView style={globalStyles.container}>
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          onClear={clearSearch}
          placeholder="Buscar productos..."
        />
        {/* Scroll vertical para todas las secciones */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          {secciones.map(seccion => (
            <View key={seccion.key} style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{seccion.label}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Explorar', {
                    screen: 'ProductList',
                    params: {
                      filter: seccion.filterKey,
                      sectionLabel: seccion.label,
                    }
                  })}
                  style={styles.seeMoreButton}
                >
                  <Text style={styles.seeMoreText}>Más</Text>
                </TouchableOpacity>
              </View>
              {seccion.productos.length > 0 ? (
                <FlatList
                  data={seccion.productos}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={item => item.id?.toString() || Math.random().toString()}
                  renderItem={({ item }) => (
                    <ProductItem
                      key={item.id}
                      product={item}
                      onPress={handleProductPress}
                      showBadges
                      showRating
                      compact
                      style={styles.horizontalProductItem}
                      placeholderSource={{ uri: 'https://picsum.photos/300/200?random=999' }}
                    />
                  )}
                  contentContainerStyle={styles.horizontalList}
                  initialNumToRender={5}
                  maxToRenderPerBatch={5}
                  windowSize={5}
                />
              ) : (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.text.light, fontSize: 14 }}>
                    No hay productos en esta sección.
                  </Text>
                </View>
              )}
              <View style={styles.sectionSeparator} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Modo "explorar" u otros: lógica original
  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: darkMode ? '#222' : colors.background }]}> // Global dark mode background
      <SearchBar
        value={searchTerm}
        onChangeText={setSearchTerm}
        onClear={clearSearch}
        placeholder="Buscar productos..."
      />
      {/* Sugerencia "¿Quisiste decir...?" */}
      {searchTerm.trim() && searchResults.length === 0 && closestProduct && (
        <View style={{ marginHorizontal: 24, marginTop: 2, marginBottom: 8 }}>
          <Text style={{ color: darkMode ? colors.text.white : colors.text.secondary, fontSize: 14 }}>
            ¿Quisiste decir: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{closestProduct.nombre}</Text>?
          </Text>
        </View>
      )}
      {/* Sugerencias de búsquedas recientes */}
      {recentSearches.length > 0 && searchTerm.trim().length === 0 && (
        <View style={{ marginHorizontal: 24, marginBottom: 8 }}>
          <Text style={{ color: darkMode ? colors.text.white : colors.text.secondary, fontSize: 13, marginBottom: 2 }}>Búsquedas recientes:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {recentSearches.map((s, i) => (
              <TouchableOpacity
                key={s + i}
                onPress={() => setSearchTerm(s)}
                style={{
                  backgroundColor: darkMode ? '#333' : colors.surface,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  marginRight: 8,
                  marginBottom: 4,
                  borderWidth: 1,
                  borderColor: colors.primary,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.primary, fontSize: 13 }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      <OptimizedFlatList
        data={processedProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        numColumns={numColumns}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: spacing.lg,
  },
  
  header: {
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
  },
  
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  
  statsText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  
  offersText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
  
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: borders.radius.md,
    backgroundColor: colors.surface,
  },
  
  filterToggleText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
  
  filtersContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borders.radius.md,
  },
  
  filtersSection: {
    marginBottom: spacing.md,
  },
  
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borders.radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  filterIcon: {
    marginRight: spacing.xs,
  },
  
  filterText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  
  activeFilterText: {
    color: colors.text.white,
  },
  sectionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borders.radius.lg,
    marginHorizontal: 12,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    ...theme.shadows.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  seeMoreButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  seeMoreText: {
    color: colors.text.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  horizontalList: {
    paddingVertical: spacing.sm,
  },
  horizontalProductItem: {
    marginRight: spacing.md,
    width: 160,
  },
  sectionSeparator: {
    height: 12,
    backgroundColor: 'transparent',
  },
});

export default ProductListScreen;