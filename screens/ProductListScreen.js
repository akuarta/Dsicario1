import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  Switch
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useProducts, useCart } from '../contexts/AppContext';
import ProductItem from '../components/ProductItem';
import SearchBar from '../components/SearchBar';
import AutoCarousel from '../components/AutoCarousel';
import HeroBannerItem from '../components/HeroBannerItem';
import OptimizedFlatList from '../components/OptimizedFlatList';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { useGlobalStyles } from '../styles/globalStyles';
import FloatingCartButton from '../components/FloatingCartButton';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

const ProductListScreen = ({ navigation, route, mode = 'explorar' }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const globalStyles = useGlobalStyles();
  
  const { products, suggestedProducts, isLoading, error, refetchProducts, isEditorMode, setIsEditorMode } = useProducts();
  const { role } = useUser();
  const { waiterActiveSession, setWaiterActiveSession } = useCart();

  // 🤵 Sincronizar Sesión de Mesero al entrar
  useEffect(() => {
    if (route.params?.cliente) {
      setWaiterActiveSession({
        id_carrito: route.params.orderId || route.params.mesaId || `POS-${Date.now()}`,
        cliente: route.params.cliente,
        mesa_id: route.params.mesaId,
        mesa_nombre: route.params.mesaNombre,
        orderId: route.params.orderId // 🔑 El ID real de la orden en la nube
      });
    }
  }, [route.params?.cliente, route.params?.mesaId, route.params?.orderId]);

  const isInicio = mode === 'inicio' || route.params?.mode === 'inicio';
  // 🤵 Detectar si estamos en flujo operativo de Camarero (vía Rol Global + Sesión si es Admin)
  const isWaiterWorkFlow = role === 'Mesero' || (role === 'Admin' && waiterActiveSession);
  const activeWaiterSession = waiterActiveSession;

  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const isPreOrderMode = mode === 'preorder' || route.params?.mode === 'preorder';
  const [selectedFilter, setSelectedFilter] = useState(isPreOrderMode ? 'preorder_only' : 'all');
  
  const isExplorar = mode === 'explorar' || route.params?.mode === 'explorar';
  
  const isAdmin = role?.toLowerCase().includes('admin');

  // Recuperar parámetros de filtrado si vienen de la navegación
  useEffect(() => {
    if (route.params?.filter) {
      setSelectedFilter(route.params.filter);
    }
  }, [route.params?.filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchProducts();
    setRefreshing(false);
  }, [refetchProducts]);

  const handleProductPress = useCallback((product) => {
    if (isEditorMode) {
      navigation.navigate('ProductEditor', { product });
    } else {
      navigation.navigate('ProductDetail', { 
        product,
        target_pos_id: activeWaiterSession?.id_carrito,
        target_client: activeWaiterSession?.cliente,
        isPreOrder: isPreOrderMode
      });
    }
  }, [navigation, activeWaiterSession, isEditorMode, isPreOrderMode]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const hasActiveSearch = searchTerm.length > 0;

  // Filtrado y búsqueda
  const processedProducts = useMemo(() => {
    // Si estamos en la pestaña de sugerencias, usamos la lista de sugeridos directamente
    if (selectedFilter === 'suggestions') {
      let sugResult = suggestedProducts || [];
      if (hasActiveSearch) {
        const term = searchTerm.toLowerCase();
        sugResult = sugResult.filter(p => 
          (p.nombre || p.name)?.toLowerCase().includes(term) || 
          (p.categoria || p.category)?.toLowerCase().includes(term)
        );
      }
      return sugResult;
    }

    let result = products || [];
    
    // Búsqueda
    if (hasActiveSearch) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.nombre?.toLowerCase().includes(term) || 
        p.categoria?.toLowerCase().includes(term) ||
        p.subcategoria?.toLowerCase().includes(term)
      );
    }

    // Filtros específicos
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'available') result = result.filter(p => !p.agotado);
      if (selectedFilter === 'offers') result = result.filter(p => p.enOferta || p.descuento > 0);
      if (selectedFilter === 'bestsellers') result = result.filter(p => p.masVendido);
      if (selectedFilter === 'recommended') result = result.filter(p => p.recomendado);
      if (selectedFilter === 'house-specials') result = result.filter(p => p.delaCasa);
      if (selectedFilter === 'preorder_only') result = result.filter(p => p.isPreOrder);
    }

    // ↕️ Ordenamiento Final: Mandar agotados al final
    return [...result].sort((a, b) => {
      if (a.agotado === b.agotado) return 0;
      return a.agotado ? 1 : -1;
    });
  }, [products, suggestedProducts, searchTerm, selectedFilter, hasActiveSearch]);

  const styles = useMemo(() => StyleSheet.create({
    headerContainer: {
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
      paddingBottom: spacing.sm,
      backgroundColor: colors.primary,
      ...shadows.medium,
    },
    homeLogoSection: {
      backgroundColor: colors.primary,
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    homeLogoBadge: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)',
      ...shadows.small,
    },
    homeLogo: {
      width: 65,
      height: 65,
    },
    chipsWrapper: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chipsScrollContainer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    listContainer: {
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.xxl + 20,
    },
    sectionContainer: {
      marginTop: spacing.sm,
      paddingLeft: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingRight: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      ...typography.h6,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    seeMoreButton: {
      paddingVertical: spacing.xs,
    },
    seeMoreText: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: 'bold',
    },
    horizontalProductItem: {
      width: 180,
      marginRight: spacing.md,
    },
    sectionSeparator: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      opacity: 0.3,
    },
    waiterModeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      justifyContent: 'center',
      gap: 10,
    },
    waiterModeText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 14,
    },
    // Missing Styles Added
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: borders.radius.round,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    activeSortChip: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterIcon: {
      marginRight: spacing.xs,
    },
    filterText: {
      ...typography.bodySmall,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    activeFilterText: {
      color: '#FFFFFF',
    },
    editorToggleBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    editorToggleText: {
      fontSize: 12,
      fontWeight: 'bold',
      flex: 1,
      marginLeft: 10,
    },
    fabAdd: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      zIndex: 100,
    }
  }), [colors, darkMode]);

  const renderFilterChip = useCallback((filter) => (
    <TouchableOpacity
      key={filter.key}
      style={[
        styles.sortChip,
        selectedFilter === filter.key && styles.activeSortChip
      ]}
      onPress={() => setSelectedFilter(filter.key)}
    >
      <FontAwesome5 
        name={filter.icon} 
        size={12} 
        color={selectedFilter === filter.key ? '#FFFFFF' : colors.text.secondary} 
        opacity={0.8}
        style={styles.filterIcon}
      />
      <Text style={[
        styles.filterText, 
        selectedFilter === filter.key && styles.activeFilterText
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  ), [selectedFilter, colors, styles]);

  const filterOptions = isPreOrderMode ? [
    { key: 'all', label: 'Todos', icon: 'list' },
    { key: 'preorder_only', label: 'Pre orden', icon: 'clock' },
    { key: 'suggestions', label: 'Sugerencia', icon: 'thumbs-up' },
  ] : [
    { key: 'all', label: 'Todos', icon: 'th-large' },
    { key: 'available', label: 'Disponibles', icon: 'check-circle' },
    { key: 'offers', label: 'Ofertas', icon: 'tag' },
    { key: 'bestsellers', label: 'Más Vendidos', icon: 'fire' },
    { key: 'recommended', label: 'Recomendados', icon: 'thumbs-up' },
    { key: 'house-specials', label: 'De la Casa', icon: 'home' },
    { key: 'high-rated', label: 'Mejor Valorados', icon: 'star' },
  ];

  if (isInicio && !hasActiveSearch) {
    const sectionRules = [
      { key: 'recommended', label: 'Recomendados', filter: (p) => p.recomendado && !p.agotado, filterKey: 'recommended' },
      { key: 'offers', label: 'En oferta', filter: (p) => (p.enOferta || p.descuento > 0) && !p.agotado, filterKey: 'offers' },
      { key: 'high-rated', label: 'Mejor Valorados', filter: (p) => p.rating >= 4 && !p.agotado, filterKey: 'high-rated' },
      { key: 'bestsellers', label: 'Más Vendidos', filter: (p) => p.masVendido && !p.agotado, filterKey: 'bestsellers' },
      { key: 'house-specials', label: 'De la casa', filter: (p) => p.delaCasa && !p.agotado, filterKey: 'house-specials' },
    ];

    const secciones = sectionRules.map(rule => ({
      key: rule.key,
      label: rule.label,
      productos: products.filter(rule.filter).slice(0, 5),
      filterKey: rule.filterKey,
    }));

    // Nuevos ingresos solo si no están agotados
    const nuevosIngresos = [...(Array.isArray(products) ? products : [])]
      .filter(p => !p.agotado)
      .reverse()
      .slice(0, 5);

    return (
      <View style={[globalStyles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerContainer}>
          <SearchBar
            value={searchTerm}
            onChangeText={setSearchTerm}
            onClear={clearSearch}
            showFilterButton={false}
            onMenuPress={() => navigation.openDrawer()}
            placeholder="Buscar productos..."
            style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
          />
        </View>

        {isWaiterWorkFlow && activeWaiterSession && (
          <View style={[styles.waiterModeBanner, { backgroundColor: '#FF8C00' }]}>
            <FontAwesome5 name="concierge-bell" size={16} color="#FFF" />
            <Text style={styles.waiterModeText}>
              🥘 Ordenando para: <Text style={{ fontWeight: '900' }}>{activeWaiterSession.cliente}</Text>
            </Text>
          </View>
        )}

        {/* 🛠️ Banner de Modo Editor para Administradores (Vista Inicio) */}
        {isAdmin && (
          <View 
            style={[styles.editorToggleBar, { backgroundColor: isEditorMode ? colors.success : colors.surface, marginTop: 10 }]}
          >
            <FontAwesome5 name="edit" size={14} color={isEditorMode ? "#FFF" : colors.primary} />
            <Text style={[styles.editorToggleText, { color: isEditorMode ? "#FFF" : colors.text.primary }]}>
              MODO EDITOR: <Text style={{ fontWeight: '900' }}>{isEditorMode ? 'ACTIVO' : 'INACTIVO'}</Text>
            </Text>
            <Switch 
              value={isEditorMode} 
              onValueChange={setIsEditorMode}
              trackColor={{ false: '#767577', true: colors.success + '80' }}
              thumbColor={isEditorMode ? '#FFF' : '#f4f3f4'}
            />
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          {nuevosIngresos.length > 0 && (
            <View style={[styles.sectionContainer, { marginTop: spacing.md, paddingLeft: 0 }]}>
              <View style={[styles.sectionHeader, { paddingLeft: spacing.md }]}>
                <Text style={styles.sectionTitle}>Agregado Reciente</Text>
              </View>
              <AutoCarousel 
                data={nuevosIngresos}
                autoPlayInterval={4500}
                renderItem={({ item }) => (
                  <HeroBannerItem product={item} onPress={handleProductPress} />
                )}
              />
              <View style={[styles.sectionSeparator, { marginHorizontal: spacing.md }]} />
            </View>
          )}

          {secciones.map(seccion => (
            <View key={seccion.key} style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{seccion.label}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Explorar', {
                    screen: 'ProductList',
                    params: { filter: seccion.filterKey, sectionLabel: seccion.label }
                  })}
                  style={styles.seeMoreButton}
                >
                  <Text style={styles.seeMoreText}>Más</Text>
                </TouchableOpacity>
              </View>
              {seccion.productos.length > 0 && (
                <FlatList
                  data={seccion.productos}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => item.id?.toString() || `prod-${index}`}
                  renderItem={({ item }) => (
                    <ProductItem
                      product={item}
                      onPress={handleProductPress}
                      compact
                      style={styles.horizontalProductItem}
                    />
                  )}
                />
              )}
            </View>
          ))}
        </ScrollView>
        {/* ➕ Botón Flotante para Añadir Producto (Vista Inicio) */}
        {isAdmin && isEditorMode && (
          <TouchableOpacity 
            style={styles.fabAdd}
            onPress={() => navigation.navigate('ProductEditor')}
          >
            <FontAwesome5 name="plus" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[globalStyles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          onClear={clearSearch}
          onFilterPress={() => {}}
          onMenuPress={() => navigation.openDrawer()}
          placeholder="Buscar en DSicario..."
        />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContainer}
        >
          {filterOptions.map(renderFilterChip)}
        </ScrollView>
      </View>

      {/* 🛠️ Banner de Modo Editor para Administradores */}
      {isAdmin && (
        <View 
          style={[styles.editorToggleBar, { backgroundColor: isEditorMode ? colors.success : colors.surface }]}
        >
          <FontAwesome5 name="edit" size={14} color={isEditorMode ? "#FFF" : colors.primary} />
          <Text style={[styles.editorToggleText, { color: isEditorMode ? "#FFF" : colors.text.primary }]}>
            MODO EDITOR: <Text style={{ fontWeight: '900' }}>{isEditorMode ? 'ACTIVO' : 'INACTIVO'}</Text>
          </Text>
          <Switch 
            value={isEditorMode} 
            onValueChange={setIsEditorMode}
            trackColor={{ false: '#767577', true: colors.success + '80' }}
            thumbColor={isEditorMode ? '#FFF' : '#f4f3f4'}
          />
        </View>
      )}

      {isWaiterWorkFlow && activeWaiterSession && (
        <View style={[styles.waiterModeBanner, { backgroundColor: '#FF8C00' }]}>
          <FontAwesome5 name="concierge-bell" size={16} color="#FFF" />
          <Text style={styles.waiterModeText}>
            🥘 Ordenando para: <Text style={{ fontWeight: '900' }}>{activeWaiterSession.cliente}</Text>
          </Text>
        </View>
      )}

      <OptimizedFlatList 
        data={processedProducts}
        renderItem={({ item }) => (
          <ProductItem 
            product={item} 
            onPress={handleProductPress}
            style={{ flex: 1, margin: 4 }}
          />
        )}
        numColumns={2}
        keyExtractor={(item, index) => item.id?.toString() || `opt-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* ➕ Botón Flotante Adaptativo */}
      {(isEditorMode || selectedFilter === 'suggestions') && (
        <TouchableOpacity 
          style={[styles.fabAdd, selectedFilter === 'suggestions' && { backgroundColor: colors.primary }]}
          onPress={() => {
            if (selectedFilter === 'suggestions') {
              // Navegar al editor con flags de sugerencia
              navigation.navigate('ProductEditor', { 
                product: { isSuggestion: true },
                isSuggestionFlow: true 
              });
            } else {
              navigation.navigate('ProductEditor');
            }
          }}
        >
          <FontAwesome5 name={selectedFilter === 'suggestions' ? "lightbulb" : "plus"} size={24} color="#FFF" />
          {selectedFilter === 'suggestions' && (
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>SUGERIR</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ProductListScreen;