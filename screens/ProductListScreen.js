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
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useProducts, useCart } from '../contexts/AppContext';
import ProductItem from '../components/ProductItem';
import SearchBar from '../components/SearchBar';
import AutoCarousel from '../components/AutoCarousel';
import HeroBannerItem from '../components/HeroBannerItem';
import OptimizedFlatList from '../components/OptimizedFlatList';
import GlassPanel from '../components/GlassPanel';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { showAlert } from '../utils/showAlert';
import { useThemeMode } from '../contexts/ThemeContext';
import { useDataSync } from '../contexts/AppContext';
import { useGlobalStyles } from '../styles/globalStyles';
import FloatingCartButton from '../components/FloatingCartButton';
import { useUser } from '../contexts/UserContext';
import { 
  createDraftOrder, 
  updateTableStatus, 
  hardResetTable, 
  deleteOrder, 
  generateOrderId, 
  updateOrderStatus,
  fetchAlmacen,
  fetchRecetas,
  saveRecipeIngredient,
  deleteRecipeIngredient
} from '../utils/api';

const { width } = Dimensions.get('window');

const ProductListScreen = ({ navigation, route, mode = 'explorar' }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const globalStyles = useGlobalStyles();
  
  const { 
    products, 
    suggestedProducts, 
    isLoading, 
    error, 
    refetchProducts, 
    isEditorMode, 
    setIsEditorMode,
    hasUpdates,
    applyUpdates
  } = useProducts();
  const { role, isClientMode } = useUser();
  const { 
    waiterActiveSession, 
    setWaiterActiveSession, 
    businessInfo, 
    cart, 
    getTotalCost, 
    clearCart, 
    removeFromCart, 
    updateCartItemQuantity,
    isWaiterMode, 
    activeStaffMode 
  } = useCart();
  const { syncAllData } = useDataSync();

  const getStaffModeDetails = useCallback(() => {
    switch (activeStaffMode) {
      case 'cocina': return { label: 'MODO COCINA', color: '#E67E22', icon: 'utensils' };
      case 'mesero': return { label: 'MODO MESERO', color: '#FF8C00', icon: 'concierge-bell' };
      case 'repartidor': return { label: 'MODO REPARTIDOR', color: '#2980B9', icon: 'motorcycle' };
      case 'rideradmin': return { label: 'ADMIN DE REPARTIDORES', color: '#8E44AD', icon: 'map-marked-alt' };
      case 'personal': return { label: 'GESTIÓN DE PERSONAL', color: '#16A085', icon: 'users' };
      default: return null;
    }
  }, [activeStaffMode]);
  
  const staffModeDetails = getStaffModeDetails();

  // 🤵 Sincronizar Sesión de Mesero al entrar
  useEffect(() => {
    if (route.params?.cliente) {
      console.log('📥 PARAMS RECIBIDOS EN ProductList:', JSON.stringify(route.params));
      setWaiterActiveSession({
        id_carrito: route.params.orderId || route.params.mesaId || `POS-${Date.now()}`,
        cliente: route.params.cliente,
        mesa_id: route.params.mesaId,
        mesa_nombre: route.params.mesaNombre,
        orderId: route.params.orderId
      });
      console.log('🪑 Sesión mesero guardada con mesa_id:', route.params.mesaId);
    }
  }, [route.params]);

  const isInicio = mode === 'inicio' || route.params?.mode === 'inicio';
  // 🤵 Detectar si estamos en flujo operativo de Camarero (vía Rol Global + Sesión si es Admin)
  const normalizedRole = role?.toLowerCase() || '';
  // Panel de mesero visible cuando el modo está activo (switch global)
  const isWaiterWorkFlow = isWaiterMode;
  const activeWaiterSession = waiterActiveSession;

  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const isPreOrderMode = mode === 'preorder' || route.params?.mode === 'preorder';
  const [selectedFilter, setSelectedFilter] = useState(isPreOrderMode ? 'preorder_only' : 'all');

  // --- RECIPE EDITOR STATE ---
  const [isRecipeModalVisible, setIsRecipeModalVisible] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState(null);
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [almacenItems, setAlmacenItems] = useState([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [searchAlmacen, setSearchAlmacen] = useState('');
  const [hasUnsavedRecipeChanges, setHasUnsavedRecipeChanges] = useState(false);

  // --- RECIPE EDITOR FUNCTIONS ---
  const handleCloseRecipeModal = () => {
    if (hasUnsavedRecipeChanges) {
      Alert.alert(
        'Cambios sin guardar',
        '¿Deseas descartar los cambios realizados en la receta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => {
              setIsRecipeModalVisible(false);
              setHasUnsavedRecipeChanges(false);
          }}
        ]
      );
    } else {
      setIsRecipeModalVisible(false);
    }
  };

  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  const handleOpenRecipeEditor = async (product) => {
    try {
      setRecipeProduct(product);
      setRecipeIngredients([]); // Limpiar receta anterior inmediatamente
      setIsLoadingRecipe(true);
      setIsRecipeModalVisible(true);
      setHasUnsavedRecipeChanges(false);
      
      // Cargar ingredientes actuales de este producto
      const [allRecipes, allAlmacen] = await Promise.all([
        fetchRecetas(),
        fetchAlmacen()
      ]);
      
      setAlmacenItems(allAlmacen);
      
      // Filtrar recetas por el nombre del producto
      const currentIngredients = allRecipes.filter(r => 
        (r['productos terminados'] || r['Producto']) === product.nombre
      ).map(r => ({
        IDrecetas: r.IDrecetas,
        ingredientName: r.ingrediente || r['Ingrediente'],
        quantity: r['cant. pocion'] || r['Cantidad'] || '0',
        unit: r['tipo de porcion'] || r['Unidad'] || 'und'
      }));
      
      setRecipeIngredients(currentIngredients);
    } catch (err) {
      console.error('Error al abrir receta:', err);
      showAlert('Error', 'No se pudieron cargar los datos de la receta');
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleAddIngredientToRecipe = (item) => {
    // Evitar duplicados
    if (recipeIngredients.find(i => i.ingredientName === item.nombre)) {
      showAlert('Aviso', 'Este ingrediente ya está en la receta');
      return;
    }
    
    const newIng = {
      IDrecetas: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ingredientName: item.nombre,
      quantity: '1',
      unit: item.tipoPorcion || item.tipoMedida || 'und'
    };
    
    setRecipeIngredients([...recipeIngredients, newIng]);
    setHasUnsavedRecipeChanges(true);
  };

  const handleRemoveIngredientFromRecipe = async (index) => {
    const ing = recipeIngredients[index];
    // Si tiene un ID real (no temporal), podríamos borrarlo de la base de datos
    // Pero por simplicidad, lo quitamos de la lista local y se limpia al guardar
    const newList = [...recipeIngredients];
    newList.splice(index, 1);
    setRecipeIngredients(newList);
    setHasUnsavedRecipeChanges(true);
  };

  const handleSaveRecipe = async () => {
    if (!recipeProduct) return;
    setIsSavingRecipe(true);
    
    try {
      // 1. Borrar ingredientes viejos no es trivial con esta API sin un "Delete All for Product"
      // Así que simplemente guardamos/actualizamos los actuales.
      // NOTA: Para un sistema completo, deberíamos marcar los borrados para eliminarlos en la BD.
      
      for (const ing of recipeIngredients) {
        await saveRecipeIngredient({
          IDrecetas: ing.IDrecetas,
          productName: recipeProduct.nombre,
          ingredientName: ing.ingredientName,
          quantity: ing.quantity,
          unit: ing.unit
        });
      }
      
      showAlert('Éxito', 'Receta guardada correctamente');
      setHasUnsavedRecipeChanges(false);
      setIsRecipeModalVisible(false);
    } catch (err) {
      console.error('Error saving recipe:', err);
      showAlert('Error', 'Hubo un problema al guardar la receta');
    } finally {
      setIsSavingRecipe(false);
    }
  };
  
  const isExplorar = mode === 'explorar' || route.params?.mode === 'explorar';
  
  const isAdmin = role?.toLowerCase().includes('admin') || role?.toLowerCase().includes('owner');

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

  // 🤵 Modal para que Owner/Admin arranquen una orden directamente
  const [showMesaModal, setShowMesaModal] = useState(false);
  const [isOpeningMesa, setIsOpeningMesa] = useState(false);
  const [isClosingMesa, setIsClosingMesa] = useState(false);
  const [mesaClienteNombre, setMesaClienteNombre] = useState('');

  const handleIniciarMesa = async () => {
    if (!mesaClienteNombre.trim()) {
      showAlert('Error', 'Ingresa el nombre del cliente.');
      return;
    }
    setIsOpeningMesa(true);
    try {
      const orderId = generateOrderId('W');
      const cName = mesaClienteNombre.trim();
      await createDraftOrder({ orderId, cliente: cName, mesa_id: null, usuario: 'Owner' });
      setWaiterActiveSession({
        id_carrito: orderId,
        cliente: cName,
        mesa_id: null,
        mesa_nombre: 'Mostrador',
        orderId
      });
      setMesaClienteNombre('');
      setShowMesaModal(false);
    } catch (e) {
      showAlert('Error', 'No se pudo iniciar la orden.');
    } finally {
      setIsOpeningMesa(false);
    }
  };

  const handleCerrarMesaBanner = () => {
    const isDraft = !!activeWaiterSession?.isDraft;
    const orderId = activeWaiterSession?.orderId;
    const mesaId = activeWaiterSession?.mesa_id;

    // Determinar acción según estado (simplificado para la carta)
    // En la carta solemos estar en 'draft' o 'pending/preparing'
    
    const processLiberacion = async (finalStatus = null, shouldDelete = false) => {
      console.log('🚀 [CIERRE] INICIANDO PROCESO DE LIBERACIÓN');
      setIsClosingMesa(true);
      try {
        const currentOrderId = orderId;
        const currentMesaId = mesaId;

        console.log('📍 [CIERRE] Info:', { currentOrderId, currentMesaId, finalStatus, shouldDelete });

        // 1. Pedido
        if (shouldDelete && currentOrderId) {
          console.log('Step 1/4: 🗑️ Eliminando pedido en servidor...');
          const delRes = await deleteOrder(currentOrderId);
          console.log('Step 1/4: ✅ Resultado borrado:', delRes);
        } else if (finalStatus && currentOrderId) {
          console.log(`Step 1/4: 📦 Actualizando pedido a ${finalStatus}...`);
          const upRes = await updateOrderStatus(currentOrderId, finalStatus);
          console.log('Step 1/4: ✅ Resultado actualización:', upRes);
        } else {
          console.log('Step 1/4: ⏩ Saltando gestión de pedido (no hay ID o no aplica)');
        }

        // 2. Mesa
        if (currentMesaId != null && currentMesaId !== '' && !['1','2','3','4'].includes(String(currentMesaId))) {
          const currentMesaNombre = activeWaiterSession?.mesa_nombre || currentMesaId;
          console.log(`Step 2/4: 🧹 Limpiando mesa ${currentMesaId} (${currentMesaNombre}) en Google Sheets...`);
          const resetRes = await hardResetTable(currentMesaId, currentMesaNombre);
          console.log('Step 2/4: ✅ Resultado limpieza mesa:', resetRes);
        } else {
          console.log('Step 2/4: ⏩ Saltando limpieza de mesa (Virtual o Vacía)');
        }
        
        // 3. Limpieza local
        console.log('Step 3/4: 🧼 Limpiando carrito y sesión local...');
        clearCart();
        setWaiterActiveSession(null);
        
        // 4. Sincronización
        console.log('Step 4/4: 🔄 Sincronizando datos globales para actualizar mapa...');
        await syncAllData();
        
        console.log('🏁 [CIERRE] PROCESO FINALIZADO CON ÉXITO. Navegando...');
        navigation.navigate('WaiterHome');
      } catch (error) {
        console.error('❌ [CIERRE] ERROR CRÍTICO:', error);
        showAlert('Error', 'No se pudo completar el cierre. Revisa tu conexión.');
        navigation.navigate('WaiterHome');
      } finally {
        setIsClosingMesa(false);
      }
    };

    if (isDraft) {
      showAlert('Cerrar Mesa', '¿Borrar borrador y liberar mesa?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', onPress: () => processLiberacion(null, true), style: 'destructive' }
      ]);
    } else {
      // Si no es draft, es que ya se envió algo
      showAlert('Finalizar Mesa', '¿Qué deseas hacer con este pedido?', [
        { text: 'Solo Liberar', onPress: () => processLiberacion() },
        { text: 'CANCELAR ❌', onPress: () => processLiberacion('cancelled'), style: 'destructive' },
        { text: 'COBRADA ✅', onPress: () => processLiberacion('completed'), style: 'default' }
      ]);
    }
  };

  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
  const handleSendToKitchen = async () => {
    if (cart.length === 0) {
      showAlert('Vacío', 'Agrega productos antes de enviar a cocina.');
      return;
    }
    setIsSendingToKitchen(true);
    try {
      const orderId = activeWaiterSession?.orderId;
      const total = getTotalCost();
      const itemsJson = JSON.stringify(cart.map(item => ({ 
        nombre: item.isPreOrder ? `[PRE] ${item.nombre}` : item.nombre, 
        cantidad: item.quantity, 
        precio: item.precio,
        isPreOrder: !!item.isPreOrder
      })));
      
      const success = await updateOrderStatus(orderId, 'pending', {
        'Pedido_Items': itemsJson,
        'Total': total
      });
      
      if (success) {
        clearCart();
        navigation.navigate('InicioTab'); // Vuelve al panel del mesero (WaiterScreen)
        showAlert('¡Enviado!', 'La orden ha sido enviada a cocina.');
      } else {
        throw new Error("No update");
      }
    } catch (e) {
      showAlert('Error', 'No se pudo enviar la orden a cocina.');
    } finally {
      setIsSendingToKitchen(false);
    }
  };

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
    updateBanner: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 4,
      ...shadows.medium,
    },
    updateGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      gap: 10,
    },
    updateText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 12,
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
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
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
          <View style={styles.homeLogoSection}>
             <View style={styles.homeLogoBadge}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.homeLogo} 
                  resizeMode="contain" 
                />
             </View>
          </View>
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
        
        {/* 🔘 Botón de Actualización Sutil */}
        {hasUpdates && (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={applyUpdates}
            style={styles.updateBanner}
          >
            <LinearGradient
              colors={[colors.primary, '#D62828']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.updateGradient}
            >
              <FontAwesome5 name="sync-alt" size={12} color="#FFF" />
              <Text style={styles.updateText}>Actualizaciones disponibles. Toca para refrescar</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {businessInfo?.closed && (
          <View style={{ backgroundColor: '#2D0050', paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <FontAwesome5 name="moon" size={14} color="#B19CD9" />
            <Text style={{ color: '#E6E6FA', fontWeight: 'bold', fontSize: 13 }}>MODO PRE-ORDEN ACTIVO: RECIBE AL ABRIR 🌙</Text>
          </View>
        )}

        {/* 🤵 Banner de Sesión Activa (Mesero) */}
        {isWaiterWorkFlow && activeWaiterSession && (
          <View style={[styles.waiterModeBanner, { 
            backgroundColor: '#FF8C00', 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            paddingHorizontal: 14,
            paddingVertical: 12,
            zIndex: 1000,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(0,0,0,0.1)'
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 20 }}>
                <FontAwesome5 name="user-tie" size={14} color="#FFF" />
              </View>
              <View>
                <Text style={{ color: '#FFF', fontSize: 10, opacity: 0.9 }}>ATENDIENDO A:</Text>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{activeWaiterSession.cliente}</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleCerrarMesaBanner}
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                paddingVertical: 6, 
                paddingHorizontal: 12, 
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.4)'
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>CERRAR MESA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🛠️ Banner de Modo Editor para Administradores (Vista Inicio) */}
        {isAdmin && (
          <View 
            style={[styles.editorToggleBar, { backgroundColor: isEditorMode ? colors.success : colors.surface, marginTop: 10 }]}
          >
            <FontAwesome5 name="edit" size={14} color={isEditorMode ? "#FFF" : colors.primary} />
            <Text style={[styles.editorToggleText, { color: isEditorMode ? "#FFF" : colors.text.primary }]}>
              {"MODO EDITOR: "}
              <Text style={{ fontWeight: '900' }}>{isEditorMode ? 'ACTIVO' : 'INACTIVO'}</Text>
            </Text>
            <Switch 
              value={isEditorMode} 
              onValueChange={setIsEditorMode}
              trackColor={{ false: '#767577', true: colors.success + '80' }}
              thumbColor={isEditorMode ? '#FFF' : '#f4f3f4'}
            />
          </View>
        )}

        {/* 👨‍💼 Banner de Modo Personal Activo (Vista Inicio) */}
        {!isClientMode && staffModeDetails && !(activeStaffMode === 'mesero' && activeWaiterSession) && (
          <View style={[styles.editorToggleBar, { backgroundColor: staffModeDetails.color, marginTop: 10, justifyContent: 'center' }]}>
            <FontAwesome5 name={staffModeDetails.icon} size={14} color="#FFF" />
            <Text style={[styles.editorToggleText, { color: '#FFF' }]}>
              <Text style={{ fontWeight: '900' }}>{staffModeDetails.label}</Text>
              {" ACTIVO"}
            </Text>
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

          {secciones.filter(s => s.productos.length > 0).map(seccion => (
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
              <FlatList
                data={seccion.productos}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => item.id?.toString() || `prod-${index}`}
                renderItem={({ item }) => (
                  <ProductItem
                    product={item}
                    onPress={handleProductPress}
                    onRecipePress={handleOpenRecipeEditor}
                    compact
                    style={styles.horizontalProductItem}
                  />
                )}
              />
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
        {businessInfo?.closed && (
          <View style={{ backgroundColor: '#2D0050', paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <FontAwesome5 name="moon" size={12} color="#B19CD9" />
            <Text style={{ color: '#E6E6FA', fontWeight: 'bold', fontSize: 12 }}>MODO PRE-ORDEN 🌙</Text>
          </View>
        )}
        


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
            {"MODO EDITOR: "}
            <Text style={{ fontWeight: '900' }}>{isEditorMode ? 'ACTIVO' : 'INACTIVO'}</Text>
          </Text>
          <Switch 
            value={isEditorMode} 
            onValueChange={setIsEditorMode}
            trackColor={{ false: '#767577', true: colors.success + '80' }}
            thumbColor={isEditorMode ? '#FFF' : '#f4f3f4'}
          />
        </View>
      )}

      {/* 🤵 BLOQUEO TOTAL PARA MESEROS SIN SESIÓN (Como View absoluto para no tapar toda la App) */}
      {isWaiterMode && !activeWaiterSession?.cliente && (
        <View style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.85)', 
          zIndex: 9999, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 20 
        }}>
          <GlassPanel intensity={25} style={{ width: '100%', maxWidth: 350, padding: 35, alignItems: 'center', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ backgroundColor: colors.primary + '25', padding: 20, borderRadius: 100, marginBottom: 20 }}>
              <FontAwesome5 name="concierge-bell" size={40} color={colors.primary} />
            </View>
            
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 10 }}>
              Atención Requerida 🤵
            </Text>
            
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 30, lineHeight: 22 }}>
              Debes seleccionar una mesa en el panel de servicio para poder tomar pedidos.
            </Text>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setShowMesaModal(true)}
              style={{ 
                backgroundColor: colors.primary, 
                width: '100%', 
                paddingVertical: 16, 
                borderRadius: 16, 
                alignItems: 'center',
                marginBottom: 15,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 6
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>ORDEN RÁPIDA (MOSTRADOR) 🥡</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('WaiterHome')}
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.1)',
                width: '100%',
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)'
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>IR AL MAPA DE MESAS 📍</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setActiveStaffMode(null);
                navigation.navigate('InicioTab');
              }}
              style={{ marginTop: 25 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecorationLine: 'underline' }}>
                Regresar al Inicio (Salir del Modo Mesero)
              </Text>
            </TouchableOpacity>
          </GlassPanel>
        </View>
      )}

      {/* 🤵 Banner de Modo Personal Activo (Resto de modos) */}
      {!isClientMode && staffModeDetails && activeStaffMode !== 'mesero' && (
        <View style={[styles.editorToggleBar, { backgroundColor: staffModeDetails.color, justifyContent: 'center' }]}>
          <FontAwesome5 name={staffModeDetails.icon} size={14} color="#FFF" />
          <Text style={[styles.editorToggleText, { color: '#FFF' }]}>
            <Text style={{ fontWeight: '900' }}>{staffModeDetails.label}</Text>
            {" ACTIVO"}
          </Text>
        </View>
      )}

      {/* 🤵 Banner de Sesión Activa (Mesero) */}
      {isWaiterWorkFlow && activeWaiterSession && (
        <View style={[styles.waiterModeBanner, { 
          backgroundColor: '#FF8C00', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingHorizontal: 14,
          paddingVertical: 12,
          zIndex: 1000,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(0,0,0,0.1)'
        }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 20 }}>
              <FontAwesome5 name="user-tie" size={14} color="#FFF" />
            </View>
            <View>
              <Text style={{ color: '#FFF', fontSize: 10, opacity: 0.9 }}>ATENDIENDO A:</Text>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{activeWaiterSession.cliente}</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleCerrarMesaBanner}
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              paddingVertical: 6, 
              paddingHorizontal: 12, 
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.4)'
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>CERRAR MESA</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para iniciar orden de mesa */}
      <Modal visible={showMesaModal} transparent animationType="fade" onRequestClose={() => setShowMesaModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: 20, padding: 25 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 5 }}>🤵 Nueva Orden</Text>
            <Text style={{ color: colors.text.secondary, marginBottom: 15, fontSize: 13 }}>¿Para quién es el pedido?</Text>
            <TextInput
              placeholder="Nombre del cliente..."
              placeholderTextColor={colors.text.secondary}
              value={mesaClienteNombre}
              onChangeText={setMesaClienteNombre}
              style={{ backgroundColor: colors.background, padding: 12, borderRadius: 12, color: colors.text.primary, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowMesaModal(false)} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.text.secondary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleIniciarMesa}
                disabled={isOpeningMesa}
                style={{ flex: 1, backgroundColor: colors.primary, padding: 12, borderRadius: 12, alignItems: 'center' }}
              >
                {isOpeningMesa
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>INICIAR</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      <View style={{ flex: 1, flexDirection: width > 800 ? 'row' : 'column' }}>
        <View style={{ flex: 1 }}>
          <OptimizedFlatList 
            data={processedProducts}
            renderItem={({ item }) => (
              <ProductItem 
                product={item} 
                onPress={handleProductPress}
                onRecipePress={handleOpenRecipeEditor}
                style={{ flex: 1, margin: 4 }}
              />
            )}
            numColumns={width > 1000 ? 4 : width > 700 ? 3 : 2}
            key={width > 1000 ? 'cols4' : width > 700 ? 'cols3' : 'cols2'}
            keyExtractor={(item, index) => item.id?.toString() || `opt-${index}`}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>

        {/* Lado derecho/inferior: Split Screen para el Mesero */}
        {isWaiterWorkFlow && activeWaiterSession && (
          <View style={[{ 
            backgroundColor: colors.surface, 
            borderLeftWidth: width > 800 ? 1 : 0, 
            borderTopWidth: width <= 800 ? 1 : 0, 
            borderColor: colors.border,
            width: width > 800 ? 320 : '100%',
            height: width <= 800 ? (cart.length > 0 ? 250 : 80) : '100%',
            padding: 10
          }]}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: 10 }}>Cuenta ({cart.length})</Text>
            
            {cart.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.text.secondary }}>Selecciona productos del menú</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={cart}
                  keyExtractor={(item, idx) => `cart-${item.id}-${idx}`}
                  style={{ flex: 1 }}
                  renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text.primary, fontSize: 13, fontWeight: 'bold' }} numberOfLines={1}>{item.nombre}</Text>
                        <Text style={{ color: colors.text.secondary, fontSize: 11 }}>RD$ {(item.precio * item.quantity).toFixed(2)}</Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                        <TouchableOpacity 
                          onPress={() => updateCartItemQuantity(item.cartItemId, item.quantity - 1)}
                          style={{ backgroundColor: colors.error + '20', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <FontAwesome5 name="minus" size={10} color={colors.error} />
                        </TouchableOpacity>
                        
                        <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: 'bold', marginHorizontal: 8 }}>{item.quantity}</Text>
                        
                        <TouchableOpacity 
                          onPress={() => updateCartItemQuantity(item.cartItemId, item.quantity + 1)}
                          style={{ backgroundColor: colors.primary + '20', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <FontAwesome5 name="plus" size={10} color={colors.primary} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity onPress={() => removeFromCart(item.cartItemId || item.id)} style={{ padding: 5 }}>
                        <FontAwesome5 name="times" size={14} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.primary }}>Total:</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>RD$ {getTotalCost().toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={{ backgroundColor: colors.success, padding: 12, borderRadius: 8, alignItems: 'center', opacity: isSendingToKitchen ? 0.7 : 1 }}
                    onPress={handleSendToKitchen}
                    disabled={isSendingToKitchen}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                      {isSendingToKitchen ? 'ENVIANDO...' : '🔥 ENVIAR A COCINA'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>

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
      {/* Modal de Carga para Cierre de Mesa */}
      <Modal transparent visible={isClosingMesa} animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            padding: 30,
            backgroundColor: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
            borderRadius: 20,
            alignItems: 'center'
          }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 15, color: darkMode ? '#fff' : '#333', fontWeight: 'bold' }}>Cerrando mesa...</Text>
          </View>
        </View>
      </Modal>

      {/* 📖 MODAL: EDITOR DE RECETAS */}
      <Modal
        visible={isRecipeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseRecipeModal}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 15, maxHeight: '90%', overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 15 }}>
              <View>
                <Text style={{ ...typography.h3, color: colors.text }}>Receta: {recipeProduct?.nombre}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Define los ingredientes de este producto</Text>
              </View>
              <TouchableOpacity onPress={handleCloseRecipeModal}>
                <FontAwesome5 name="times" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {/* Ingredientes Actuales */}
              <Text style={{ fontWeight: 'bold', color: colors.primary, marginBottom: 10 }}>Ingredientes en Receta</Text>
              
              {isLoadingRecipe ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Cargando receta...</Text>
                </View>
              ) : recipeIngredients.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 10 }}>No hay ingredientes definidos</Text>
              ) : (
                recipeIngredients.map((ing, idx) => (
                  <View key={idx} style={{ flexDirection: 'column', backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                    {/* Fila 1: Nombre y Basurero */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ flex: 1, color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{ing.ingredientName}</Text>
                      <TouchableOpacity onPress={() => handleRemoveIngredientFromRecipe(idx)} style={{ padding: 5, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 5 }}>
                        <FontAwesome5 name="trash-alt" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Fila 2: Stepper de Cantidad y Ciclo de Unidad */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      
                      {/* Stepper (- input +) */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                        <TouchableOpacity 
                          style={{ padding: 12, borderRightWidth: 1, borderRightColor: colors.border }}
                          onPress={() => {
                            const newList = [...recipeIngredients];
                            const val = parseFloat(newList[idx].quantity) || 0;
                            // Prevenir bajar de 0
                            newList[idx].quantity = String(Math.max(0, val - 0.5));
                            setRecipeIngredients(newList);
                            setHasUnsavedRecipeChanges(true);
                          }}
                        >
                          <FontAwesome5 name="minus" size={12} color={colors.textSecondary} />
                        </TouchableOpacity>
                        
                        <TextInput
                          style={{ color: colors.text, padding: 8, width: 55, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}
                          value={String(ing.quantity)}
                          keyboardType="numeric"
                          onChangeText={(text) => {
                            const newList = [...recipeIngredients];
                            // Solo permitir números y punto decimal
                            newList[idx].quantity = text.replace(/[^0-9.]/g, '');
                            setRecipeIngredients(newList);
                            setHasUnsavedRecipeChanges(true);
                          }}
                        />
                        
                        <TouchableOpacity 
                          style={{ padding: 12, borderLeftWidth: 1, borderLeftColor: colors.border }}
                          onPress={() => {
                            const newList = [...recipeIngredients];
                            const val = parseFloat(newList[idx].quantity) || 0;
                            newList[idx].quantity = String(val + 0.5);
                            setRecipeIngredients(newList);
                            setHasUnsavedRecipeChanges(true);
                          }}
                        >
                          <FontAwesome5 name="plus" size={12} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      {/* Unidad Fija del Almacén */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, minWidth: 70, justifyContent: 'center' }}>
                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                          {ing.unit}
                        </Text>
                      </View>
                      
                    </View>
                  </View>
                ))
              )}

              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20 }} />

              {/* Buscador de Almacén */}
              <Text style={{ fontWeight: 'bold', color: colors.primary, marginBottom: 10 }}>Añadir del Almacén</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 10, borderRadius: 8, marginBottom: 10 }}>
                <FontAwesome5 name="search" size={14} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="Buscar insumo..."
                  placeholderTextColor={colors.textSecondary}
                  style={{ color: colors.text, flex: 1 }}
                  value={searchAlmacen}
                  onChangeText={setSearchAlmacen}
                />
              </View>

              <View>
                {almacenItems
                  .filter(item => item.nombre && item.nombre.toLowerCase().includes(searchAlmacen.toLowerCase()))
                  .map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                      onPress={() => handleAddIngredientToRecipe(item)}
                    >
                      <Text style={{ color: colors.text }}>{item.nombre} ({item.tipoPorcion || item.tipoMedida || 'und'})</Text>
                      <FontAwesome5 name="plus-circle" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>

            <View style={{ padding: 20, paddingTop: 10 }}>
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' }}
                onPress={handleSaveRecipe}
                disabled={isSavingRecipe}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Guardar Receta Completa</Text>
              </TouchableOpacity>
            </View>

            {/* Overlay de Carga Guardando Receta */}
            {isSavingRecipe && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                <View style={{ backgroundColor: colors.surface, padding: 30, borderRadius: 15, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ color: colors.text, marginTop: 15, fontWeight: 'bold', fontSize: 16 }}>Guardando receta...</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 5 }}>Sincronizando con Sheets</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default ProductListScreen;

