import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import NotificationService from '../utils/notificationService';
import {
  notifyOrderReady,
} from '../utils/notifications';
import { 
  fetchProducts, 
  fetchSuggestedProducts, 
  mapSuggestedProductData,
  fetchBusinessInfo, 
  saveWaiterCartItem, 
  fetchAllUsers, 
  fetchKitchenOrders, 
  fetchDeliveries, 
  fetchTables,
  syncOfflineActions,
  clearAllCache
} from '../utils/api';
import { useUser } from './UserContext';
import { useAuth } from './AuthContext';

// Context para productos
export const ProductsContext = createContext();

// Context para carrito
export const CartContext = createContext();

// 🌐 CONTEXTO DE SINCRONIZACIÓN GLOBAL
export const DataSyncContext = createContext();

// --- PRODUCT PROVIDER CON ACTUALIZACIÓN SUBJETIVA ---
export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [isEditorMode, setIsEditorModeState] = useState(false);

  // Wrapper para guardar en AsyncStorage cada vez que cambie
  const setIsEditorMode = async (value) => {
    setIsEditorModeState(value);
    try {
      await AsyncStorage.setItem('@dsicario_editor_mode', JSON.stringify(value));
    } catch (e) {
      console.warn('Error saving editor mode:', e);
    }
  };

  // ─── FASE 1: Cargar caché de AsyncStorage INMEDIATAMENTE ───────────────────
  // Siempre llama setIsLoading(false) al terminar, con o sin datos.
  // Así la UI nunca queda bloqueada esperando la red.
  useEffect(() => {
    const loadCache = async () => {
      let initialProducts = [];
      let initialSuggested = [];
      let hasCache = false;
      try {
        const [cachedProducts, cachedSuggested, cachedEditorMode] = await Promise.all([
          AsyncStorage.getItem('@dsicario_products_cache'),
          AsyncStorage.getItem('@dsicario_suggested_cache'),
          AsyncStorage.getItem('@dsicario_editor_mode')
        ]);

        if (cachedProducts) {
          initialProducts = JSON.parse(cachedProducts);
          setProducts(initialProducts);
          hasCache = true;
        }
        if (cachedSuggested) {
          initialSuggested = JSON.parse(cachedSuggested);
          setSuggestedProducts(initialSuggested);
        }
        if (cachedEditorMode) {
          setIsEditorModeState(JSON.parse(cachedEditorMode));
        }
      } catch (e) {
        console.warn('⚠️ Error leyendo caché local:', e);
      } finally {
        console.log(`📦 Caché cargado: ${initialProducts.length} productos, ${initialSuggested.length} sugeridos`);
        // Si hay caché, desbloqueamos la UI para mostrarlo rápido
        if (hasCache && initialProducts.length > 0) {
          console.log('🚀 Desbloqueando UI con datos de caché');
          setIsLoading(false);
          if (typeof window !== 'undefined' && window.__hideSplash) {
            window.__hideSplash();
          }
        } else {
          console.log('empty_cache', 'Caché vacío o inexistente, esperando a la red...');
        }
      }

      // ─── FASE 2: Actualizar desde la red ─────────────────
      // Si no hubo caché, descargamos de la red y esperamos a que termine
      if (!hasCache || initialProducts.length === 0) {
        await refreshFromNetwork(initialProducts, initialSuggested);
      } else {
        // Si hay caché, no bloqueamos la inicialización ni recargamos de nuevo.
        // Opcionalmente se podría hacer en background, pero el usuario pidió no cargarlos de nuevo.
        console.log('⏭️ Omitiendo recarga de red en el inicio porque ya hay caché.');
      }
      
      // Aseguramos que isLoading sea false al final
      setIsLoading(false);
      if (typeof window !== 'undefined' && window.__hideSplash) {
        window.__hideSplash();
      }
    };
    loadCache();
  }, []);


  // Descarga silenciosa desde la API; no bloquea la UI ni pone loading=true.
  const refreshFromNetwork = async (currentProducts = [], currentSuggested = []) => {
    try {
      const [newProducts, newSuggested] = await Promise.all([
        fetchProducts(),
        fetchSuggestedProducts()
      ]);

      // Guard: si la API devuelve vacío y ya tenemos datos, ignoramos
      if ((!newProducts || newProducts.length === 0) && currentProducts.length > 0) {
        console.log('📦 Red devolvió vacío, manteniendo caché local');
        return;
      }

      const mappedSuggested = (newSuggested || []); // Ya vienen mapeados de api.js
      const productsToSave = newProducts && newProducts.length > 0 ? newProducts : currentProducts;
      const suggestedToSave = mappedSuggested.length > 0 ? mappedSuggested : currentSuggested;

      // Comparamos con el caché actual para decidir si aplicar directo o notificar
      const currentHash = JSON.stringify(currentProducts);
      const newHash = JSON.stringify(productsToSave);

      console.log(`📡 Red respondió: ${newProducts?.length} productos. Cambio detectado: ${currentHash !== newHash}`);

      if (isEditorMode || currentHash === '[]' || currentHash === newHash || currentProducts.length === 0) {
        // Primera carga real o sin cambios: aplicar directo y persistir
        console.log('💾 Aplicando y persistiendo productos...');
        setProducts(productsToSave);
        setSuggestedProducts(suggestedToSave);
        await Promise.all([
          AsyncStorage.setItem('@dsicario_products_cache', JSON.stringify(productsToSave)),
          AsyncStorage.setItem('@dsicario_suggested_cache', JSON.stringify(suggestedToSave))
        ]).then(() => console.log('💾 ✅ Caché específico de AppContext guardado exitosamente.'));
        setPendingData(null);
        setHasUpdates(false);
      } else {
        // Hay cambios reales: notificar al usuario con el banner
        console.log('✨ Detectadas actualizaciones en la nube (Pendiente de aplicar)');
        setPendingData({ products: productsToSave, suggested: suggestedToSave });
        setHasUpdates(true);
      }
    } catch (err) {
      console.error('🔴 Error actualizando desde red:', err);
      // No hacemos nada: el usuario ya tiene el caché local visible
    }
  };

  // Función pública para forzar un refresco (ej. desde pull-to-refresh)
  const checkForUpdates = async (forceApply = false) => {
    try {
      const [newProducts, newSuggested] = await Promise.all([
        fetchProducts(),
        fetchSuggestedProducts()
      ]);

      if (!newProducts || (newProducts.length === 0 && products.length > 0)) {
        console.log('📦 Ignorando actualización vacía para proteger el cache');
        return;
      }

      const mappedSuggested = (newSuggested || []).map(mapSuggestedProductData);
      const currentHash = JSON.stringify(products);
      const newHash = JSON.stringify(newProducts);

      if (forceApply || isEditorMode || currentHash === '[]' || currentHash === newHash) {
        setProducts(newProducts);
        setSuggestedProducts(mappedSuggested);
        await Promise.all([
          AsyncStorage.setItem('@dsicario_products_cache', JSON.stringify(newProducts)),
          AsyncStorage.setItem('@dsicario_suggested_cache', JSON.stringify(mappedSuggested))
        ]);
        setPendingData(null);
        setHasUpdates(false);
      } else {
        console.log('✨ Detectadas actualizaciones en la nube');
        setPendingData({ products: newProducts, suggested: mappedSuggested });
        setHasUpdates(true);
      }
    } catch (err) {
      console.error('Update check fail:', err);
    }
  };

  // Función para actualizar un producto individualmente en el estado local (MUCHO MÁS RÁPIDO)
  const updateProductLocally = async (updatedProduct) => {
    setProducts(prev => {
      const next = prev.map(p => {
        const pId = p.id || p.ID_Producto || p.id_producto;
        const uId = updatedProduct.id || updatedProduct.ID_Producto || updatedProduct.id_producto;
        return pId === uId ? { ...p, ...updatedProduct } : p;
      });
      // Persistir el cambio local de forma inmediata
      AsyncStorage.setItem('@dsicario_products_cache', JSON.stringify(next)).catch(console.error);
      return next;
    });
  };

  // Función para aplicar los cambios manualmente (desde el banner de UI)
  const applyUpdates = async () => {
    if (pendingData) {
      setProducts(pendingData.products);
      setSuggestedProducts(pendingData.suggested);
      await Promise.all([
        AsyncStorage.setItem('@dsicario_products_cache', JSON.stringify(pendingData.products)),
        AsyncStorage.setItem('@dsicario_suggested_cache', JSON.stringify(pendingData.suggested))
      ]);
      setPendingData(null);
      setHasUpdates(false);
    }
  };

  // Helpers de filtrado (se mantienen igual)
  const getProductsByCategory = (category) => (!category || category === 'all' ? products : products.filter(p => p.categoria?.toLowerCase() === category.toLowerCase()));
  const getFeaturedProducts = () => products.filter(p => p.recomendado || p.masVendido || p.delaCasa);
  const getAvailableProducts = () => products.filter(p => p.disponible);

  // 🧹 Limpia TODO el caché y fuerza una recarga fresca desde Google Sheets
  const hardRefreshProducts = async () => {
    console.log('🧹 [HARD REFRESH] Limpiando toda la caché y recargando desde Sheets...');
    setProducts([]);
    setSuggestedProducts([]);
    await Promise.all([
      AsyncStorage.removeItem('@dsicario_products_cache'),
      AsyncStorage.removeItem('@dsicario_suggested_cache'),
    ]);
    await checkForUpdates(true);
    console.log('✅ [HARD REFRESH] Recarga completada.');
  };

  const value = React.useMemo(() => ({
    products,
    suggestedProducts,
    isLoading,
    error,
    hasUpdates,
    applyUpdates,
    refetchProducts: (force) => checkForUpdates(force),
    hardRefreshProducts,
    updateProductLocally,
    isEditorMode,
    setIsEditorMode,
    getProductsByCategory,
    getFeaturedProducts,
    getAvailableProducts,
  }), [products, suggestedProducts, isLoading, error, hasUpdates, isEditorMode]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
};

// --- CART PROVIDER (INFO NEGOCIO) ---
export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const { role, username } = useUser();
  const [allCarts, setAllCarts] = useState({ default: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waiterActiveSession, setWaiterActiveSession] = useState(null);
  const [businessInfo, setBusinessInfo] = useState({ name: 'DSicario', closed: false });
  const [activeStaffMode, setActiveStaffModeState] = useState(null);

  // Radio-button: activa un modo y desactiva el resto. Persiste en AsyncStorage.
  const setActiveStaffMode = async (mode) => {
    // Si ya está activo, lo apaga (toggle off)
    const next = activeStaffMode === mode ? null : mode;
    setActiveStaffModeState(next);
    if (next !== 'mesero') setWaiterActiveSession(null);
    try {
      await AsyncStorage.setItem('@dsicario_staff_mode', next || '');
    } catch (e) {
      console.warn('Error saving staff mode:', e);
    }
  };

  const activeCartId = activeStaffMode === 'mesero' && waiterActiveSession?.id_carrito
    ? waiterActiveSession.id_carrito
    : 'default';

  const cart = allCarts[activeCartId] || [];

  const updateActiveCart = (updaterOrNewCart) => {
    setAllCarts(prev => {
      const currentCart = prev[activeCartId] || [];
      const updatedCart = typeof updaterOrNewCart === 'function' ? updaterOrNewCart(currentCart) : updaterOrNewCart;
      return { ...prev, [activeCartId]: updatedCart };
    });
  };

  useEffect(() => {
    const init = async () => {
      const [savedAllCarts, savedBusiness, savedStaffMode] = await Promise.all([
        AsyncStorage.getItem('@dsicario_all_carts'),
        AsyncStorage.getItem('@dsicario_business_cache'),
        AsyncStorage.getItem('@dsicario_staff_mode')
      ]);

      if (savedAllCarts) {
        try {
          setAllCarts(JSON.parse(savedAllCarts));
        } catch (e) {
          setAllCarts({ default: [] });
        }
      } else {
        // Fallback for legacy cart migration
        const savedLegacyCart = await AsyncStorage.getItem('@dsicario_cart');
        if (savedLegacyCart) {
          try {
            setAllCarts({ default: JSON.parse(savedLegacyCart) });
          } catch(e) {}
        }
      }

      if (savedBusiness) setBusinessInfo(JSON.parse(savedBusiness));
      if (savedStaffMode) setActiveStaffModeState(savedStaffMode || null);
      setIsLoaded(true);
      refreshBusiness();
    };
    init();
  }, []);

  const refreshBusiness = async () => {
    try {
      const info = await fetchBusinessInfo();
      if (info) {
        setBusinessInfo(info);
        await AsyncStorage.setItem('@dsicario_business_cache', JSON.stringify(info));
      }
    } catch (e) {}
  };

  const updateBusinessInfo = async (newInfo) => {
    setBusinessInfo(newInfo);
    await AsyncStorage.setItem('@dsicario_business_cache', JSON.stringify(newInfo));
  };

  useEffect(() => { 
    if (isLoaded) {
      AsyncStorage.setItem('@dsicario_all_carts', JSON.stringify(allCarts)); 
    }
  }, [allCarts, isLoaded]);

  const addToCart = (product) => {
    updateActiveCart((prevCart) => {
      const prodId = product.id || product.ID_Producto || product.id_producto;
      const isPre = !!product.isPreOrder;
      const note = (product.orderNote || '').trim();
      const cartItemId = `${prodId}_${isPre ? 'pre' : 'norm'}_${note}`;
      const existing = prevCart.find(item => item.cartItemId === cartItemId);
      if (existing) return prevCart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + (product.quantity || 1) } : item);
      return [...prevCart, { ...product, quantity: product.quantity || 1, id: prodId, cartItemId, isPreOrder: isPre }];
    });
  };

  const removeFromCart = (id) => updateActiveCart(p => p.filter(i => i.cartItemId !== id));
  const clearCart = () => updateActiveCart([]);
  
  const updateCartItemQuantity = (cartItemId, quantity) => {
    updateActiveCart(prev => prev.map(item => 
      item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item
    ));
  };

  const updateCartItemNote = (cartItemId, note) => {
    updateActiveCart(prev => prev.map(item => 
      item.cartItemId === cartItemId ? { ...item, orderNote: note } : item
    ));
  };

  const getTotalCost = () => cart.reduce((t, i) => t + ((parseFloat(i.descuento) > 0 ? parseFloat(i.precio) * (1 - i.descuento/100) : parseFloat(i.precio)) * i.quantity), 0);
  const getTotalItems = () => cart.reduce((t, i) => t + i.quantity, 0);

  const cartValue = React.useMemo(() => ({
    cart, addToCart, removeFromCart, clearCart, getTotalCost, getTotalItems,
    updateCartItemQuantity, updateCartItemNote,
    businessInfo, updateBusinessInfo, refreshBusiness,
    waiterActiveSession, setWaiterActiveSession,
    activeStaffMode, setActiveStaffMode,
    isWaiterMode: activeStaffMode === 'mesero', // Compatibilidad hacia atrás
    isSubmitting,
    getCartSummary: () => ({ items: cart, totalItems: getTotalItems(), totalCost: getTotalCost(), isEmpty: cart.length === 0 }),
    isInCart: (id) => cart.some(i => i.id === id),
    getProductQuantity: (id) => cart.find(i => i.id === id)?.quantity || 0,
  }), [cart, businessInfo, waiterActiveSession, activeStaffMode, isSubmitting]);

  return <CartContext.Provider value={cartValue}>{children}</CartContext.Provider>;
};

// --- DATA SYNC PROVIDER ---
export const DataSyncProvider = ({ children }) => {
  const { email, role, userId } = useUser();
  const [users, setUsers] = useState([]);
  const prevKitchenOrdersRef = useRef([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [tables, setTables] = useState([]); // 👈 Agregado
  const [isSyncing, setIsSyncing] = useState(false);
  // ✅ Ref-based guard: previene stale closure en setInterval
  const isSyncingRef = useRef(false);

  const syncAllData = async () => {
    if (isSyncingRef.current) return; // ✅ Usa ref, no estado (evita stale closure)
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      // 👈 Sincronizar acciones offline previas
      await syncOfflineActions();
      
      // 👈 fetchTables agregado al Promise.all
      const [u, k, t, d] = await Promise.all([
        fetchAllUsers().catch(() => []), 
        fetchKitchenOrders().catch(() => []),
        fetchTables().catch(() => []),
        fetchDeliveries().catch(() => [])
      ]);

      // 🛎️ Lógica de Notificaciones 🛎️
      if (prevKitchenOrdersRef.current.length > 0) {
        k.forEach(newOrder => {
          const oldOrder = prevKitchenOrdersRef.current.find(o => o.ID_Pedido === newOrder.ID_Pedido);
          
          // 1. Notificación a Empleados (nuevo pedido)
          if (!oldOrder && (role === 'admin' || role === 'staff' || role === 'Admin' || role === 'Staff' || role === 'mesero')) {
            NotificationService.sendLocalNotification(
              '¡Nuevo Pedido! 🔔',
              `El pedido #${newOrder.ID_Pedido} acaba de ingresar.`
            );
          }

          if (oldOrder) {
            // ✅ FIX: api.js normaliza el email a minúscula en el campo 'email'
            // Comparamos ambos campos por si alguna versión usa Email (capital)
            const normalizedEmail = (email || '').toLowerCase().trim();
            const orderEmail = (
              newOrder.email ||
              (newOrder.Email ? newOrder.Email.toLowerCase() : '') ||
              ''
            ).trim();
            const isMyOrder = (
              (orderEmail && normalizedEmail && orderEmail === normalizedEmail) ||
              (newOrder.userId && userId && String(newOrder.userId) === String(userId))
            );

            // 2. Notificación al cliente (Cambio de estado)
            if (oldOrder.estado !== newOrder.estado) {
              if (isMyOrder) {
                console.log('[🔔 Notify] Estado cambió:', oldOrder.estado, '->', newOrder.estado, '| Pedido:', newOrder.ID_Pedido);
                NotificationService.notifyOrderStatus(
                  newOrder.ID_Pedido,
                  newOrder.estado,
                  null
                );
              }

              // 3. Notificación cocina→mesero cuando un pedido queda listo
              const readyStates = ['ready', 'listo', '✅ listo', 'preparado'];
              const isNowReady = readyStates.some(s => (newOrder.estado || '').toLowerCase().includes(s));
              const wasReady   = readyStates.some(s => (oldOrder.estado  || '').toLowerCase().includes(s));
              if (isNowReady && !wasReady) {
                notifyOrderReady({
                  id: newOrder.ID_Pedido,
                  cliente: newOrder.cliente || newOrder.Nombre || '',
                  mesa_nombre: newOrder.mesa_nombre || newOrder.Mesa || '',
                });
              }

              // 4. Notificación al admin/staff cuando el cliente cancela
              const isCancelled = newOrder.estado === 'cancelled' || newOrder.estado === 'cancelado_cliente';
              const isStaff = role === 'admin' || role === 'Admin' || role === 'staff' || role === 'Staff' || role === 'mesero';
              if (isCancelled && isStaff) {
                NotificationService.sendLocalNotification(
                  '❌ Pedido Cancelado',
                  `El pedido #${newOrder.ID_Pedido} fue cancelado por el cliente.`
                );
              }
            }

            // 3. Notificación al cliente (Repartidor asignado)
            if (oldOrder.ID_Rider !== newOrder.ID_Rider && newOrder.ID_Rider && isMyOrder) {
              NotificationService.sendLocalNotification(
                'Repartidor Asignado 🛵',
                `Un repartidor ha tomado tu pedido #${newOrder.ID_Pedido}.`
              );
            }
          }
        });
      }
      prevKitchenOrdersRef.current = k;

      setUsers(u); 
      setKitchenOrders(k);
      setTables(t);
      setDeliveries(d); 
    } catch (e) {
      console.error('Sync Error:', e);
    } finally { 
      isSyncingRef.current = false; // ✅ Liberar el ref guard
      setIsSyncing(false); 
    }
  };

  useEffect(() => { 
    // Solicitar permisos de notificación al cargar
    NotificationService.requestPermissions().catch(console.warn);

    syncAllData();
    // ⏲️ Auto-sincronización inteligente (cada 20 segundos)
    const interval = setInterval(() => {
      syncAllData();
    }, 20000); 

    return () => clearInterval(interval);
  }, []);

  const value = React.useMemo(() => ({ 
    users, setUsers, 
    kitchenOrders, setKitchenOrders, 
    deliveries, setDeliveries,
    tables, setTables, // 👈 Expuesto en el contexto
    isSyncing, syncAllData 
  }), [users, kitchenOrders, deliveries, tables, isSyncing]);

  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
};

export const useProducts = () => useContext(ProductsContext);
export const useCart = () => useContext(CartContext);
export const useDataSync = () => useContext(DataSyncContext);
