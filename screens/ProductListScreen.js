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
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import theme from '../theme/theme';
import { globalStyles } from '../styles/globalStyles';
const { spacing, typography, borders } = theme;



const ProductListScreen = ({ navigation, route, mode }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const currentTheme = { colors, dark: darkMode };
  
  const { numColumns } = useResponsive();
  const { products, isLoading, error, refetchProducts, getCategoriesWithCounts, getProductStats } = useProducts();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedSort, setSelectedSort] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.medium,
      backgroundColor: colors.primary,
    },
    headerTitle: {
      ...typography.h5,
      color: colors.text.white,
    },
    filterSortContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: spacing.small,
      backgroundColor: colors.surface,
      borderBottomWidth: borders.thin,
      borderBottomColor: colors.border,
    },
    filterSortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.medium,
      paddingVertical: spacing.small,
      borderRadius: borders.radius.small,
      backgroundColor: colors.card,
    },
    filterSortButtonText: {
      marginLeft: spacing.small,
      ...typography.body2,
      color: colors.text.primary,
    },
    filterContainer: {
      padding: spacing.medium,
      backgroundColor: colors.background,
    },
    filterTitle: {
      ...typography.h6,
      marginBottom: spacing.small,
      color: colors.text.primary,
    },
    filterChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.medium,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: borders.radius.small,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
      marginRight: spacing.small,
      marginBottom: spacing.small,
      borderWidth: borders.thin,
      borderColor: colors.border,
    },
    activeFilterChip: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterIcon: {
      marginRight: spacing.extraSmall,
    },
    filterText: {
      ...typography.body2,
      color: colors.text.primary,
    },
    activeFilterText: {
      color: colors.text.white,
    },
    sortOptionsContainer: {
      padding: spacing.medium,
      backgroundColor: colors.background,
    },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
      marginBottom: spacing.extraSmall,
      borderRadius: borders.radius.small,
      backgroundColor: colors.card,
      borderWidth: borders.thin,
      borderColor: colors.border,
    },
    activeSortOption: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortOptionText: {
      marginLeft: spacing.small,
      ...typography.body2,
      color: colors.text.primary,
    },
    activeSortOptionText: {
      color: colors.text.white,
    },
    noResultsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.large,
    },
    noResultsText: {
      ...typography.body1,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    closestProductContainer: {
      marginTop: spacing.medium,
      padding: spacing.medium,
      backgroundColor: colors.card,
      borderRadius: borders.radius.medium,
      borderWidth: borders.thin,
      borderColor: colors.border,
      alignItems: 'center',
    },
    closestProductText: {
      ...typography.body2,
      color: colors.text.primary,
      marginBottom: spacing.small,
      textAlign: 'center',
    },
    closestProductButton: {
      backgroundColor: colors.accent,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
      borderRadius: borders.radius.small,
    },
    closestProductButtonText: {
      ...typography.button,
      color: colors.text.white,
    },
    recentSearchesContainer: {
      padding: spacing.medium,
      backgroundColor: colors.background,
      borderBottomWidth: borders.thin,
      borderBottomColor: colors.border,
    },
    recentSearchesTitle: {
      ...typography.h6,
      marginBottom: spacing.small,
      color: colors.text.primary,
    },
    recentSearchItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.small,
      borderBottomWidth: borders.thin,
    },
    recentSearchText: {
      ...typography.body2,
      color: colors.text.secondary,
    },
    clearRecentSearchesButton: {
      marginTop: spacing.small,
      alignSelf: 'flex-end',
    },
    clearRecentSearchesText: {
      ...typography.button,
      color: colors.error,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.large,
    },
    errorText: {
      ...typography.body1,
      color: colors.error,
      textAlign: 'center',
      marginBottom: spacing.medium,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
      borderRadius: borders.radius.small,
    },
    retryButtonText: {
      ...typography.button,
      color: colors.text.white,
    },
    // Estilos para el modal de filtros y ordenamiento
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: borders.radius.large,
      width: '90%',
      maxHeight: '80%',
      padding: spacing.large,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.medium,
    },
    modalTitle: {
      ...typography.h5,
      color: colors.text.primary,
    },
    closeButton: {
      padding: spacing.small,
    },
    closeButtonText: {
      ...typography.button,
      color: colors.text.secondary,
    },
    modalSectionTitle: {
      ...typography.h6,
      marginTop: spacing.medium,
      marginBottom: spacing.small,
      color: colors.text.primary,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
      marginBottom: spacing.extraSmall,
      borderRadius: borders.radius.small,
      backgroundColor: colors.card,
      borderWidth: borders.thin,
      borderColor: colors.border,
    },
    modalActiveOption: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalOptionText: {
      marginLeft: spacing.small,
      ...typography.body2,
      color: colors.text.primary,
    },
    modalActiveOptionText: {
      color: colors.text.white,
    },
    applyFiltersButton: {
      backgroundColor: colors.accent,
      paddingVertical: spacing.medium,
      borderRadius: borders.radius.medium,
      alignItems: 'center',
      marginTop: spacing.large,
    },
    applyFiltersButtonText: {
      ...typography.button,
      color: colors.text.white,
    },
  });

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
    <SafeAreaView style={[globalStyles.container, { backgroundColor: darkMode ? colors.surface : colors.background }]}> // Global dark mode background
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
                  backgroundColor: colors.surface,
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
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: borders.thin,
    borderColor: colors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 16,
    color: colors.text,
  },
  filterToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  filterToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterToggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterSection: {
    marginBottom: 10,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  productDisplayToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  productDisplayButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 5,
  },
  productDisplayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  productDisplayButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  productDisplayButtonTextActive: {
    color: colors.white,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  searchBarContainer: {
    padding: 10,
    backgroundColor: colors.background,
  },
  recentSearchesContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  recentSearchChip: {
    backgroundColor: colors.card,
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  recentSearchText: {
    color: colors.text,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  sectionListContent: {
    paddingHorizontal: 15,
  },
});

export default ProductListScreen;