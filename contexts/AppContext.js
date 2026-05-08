import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import NotificationService from '../utils/notificationService';
import {
  notifyOrderReady,
  setupKitchenChannel,
  registerForPushNotifications,
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
  syncOfflineActions
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

  // Cargar caché inicial
  useEffect(() => {
    const loadCache = async () => {
      try {
        const [cachedProducts, cachedEditorMode] = await Promise.all([
          AsyncStorage.getItem('@dsicario_products_cache'),
          AsyncStorage.getItem('@dsicario_editor_mode')
        ]);
        
        if (cachedProducts) {
          setProducts(JSON.parse(cachedProducts));
          setIsLoading(false);
        }
        
        if (cachedEditorMode) {
          setIsEditorModeState(JSON.parse(cachedEditorMode));
        }
      } catch (e) {
        console.warn('Error loading cache:', e);
      } finally {
        checkForUpdates();
      }
    };
    loadCache();
  }, []);

  // Verificar actualizaciones
  const checkForUpdates = async (forceApply = false) => {
    try {
      const [newProducts, newSuggested] = await Promise.all([
        fetchProducts(),
        fetchSuggestedProducts()
      ]);

      if (!newProducts) return;

      const mappedSuggested = (newSuggested || []).map(mapSuggestedProductData);
      const currentHash = JSON.stringify(products);
      const newHash = JSON.stringify(newProducts);

      // Si forceApply es true (ej. tras editar) o si estamos en modo editor, aplicamos directo
      if (forceApply || isEditorMode || currentHash === '[]' || currentHash === newHash) {
        setProducts(newProducts);
        setSuggestedProducts(mappedSuggested);
        await AsyncStorage.setItem('@dsicario_products_cache', JSON.stringify(newProducts));
        setPendingData(null);
        setHasUpdates(false);
        setIsLoading(false);
      } else {
        // En modo cliente normal, avisamos que hay cambios para no romper la navegación
        console.log('✨ Detectadas actualizaciones en la nube');
        setPendingData({ products: newProducts, suggested: mappedSuggested });
        setHasUpdates(true);
      }
    } catch (err) {
      console.error('Update check fail:', err);
    }
  };

  // Función para actualizar un producto individualmente en el estado local (MUCHO MÁS RÁPIDO)
  const updateProductLocally = (updatedProduct) => {
    setProducts(prev => prev.map(p => {
      const pId = p.id || p.ID_Producto || p.id_producto;
      const uId = updatedProduct.id || updatedProduct.ID_Producto || updatedProduct.id_producto;
      return pId === uId ? { ...p, ...updatedProduct } : p;
    }));
  };

  // Función para aplicar los cambios manualmente (desde el banner de UI)
  const applyUpdates = async () => {
    if (pendingData) {
      setProducts(pendingData.products);
      setSuggestedProducts(pendingData.suggested);
      await AsyncStorage.setItem('@dsicario_products_cache', JSON.stringify(pendingData.products));
      setPendingData(null);
      setHasUpdates(false);
    }
  };

  // Helpers de filtrado (se mantienen igual)
  const getProductsByCategory = (category) => (!category || category === 'all' ? products : products.filter(p => p.categoria?.toLowerCase() === category.toLowerCase()));
  const getFeaturedProducts = () => products.filter(p => p.recomendado || p.masVendido || p.delaCasa);
  const getAvailableProducts = () => products.filter(p => p.disponible);

  const value = React.useMemo(() => ({
    products,
    suggestedProducts,
    isLoading,
    error,
    hasUpdates,
    applyUpdates,
    refetchProducts: (force) => checkForUpdates(force),
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

  const syncAllData = async () => {
    if (isSyncing) return;
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
            const isMyOrder = (
              (newOrder.Email && email && newOrder.Email.toLowerCase() === email.toLowerCase()) ||
              (newOrder.userId && userId && newOrder.userId === userId)
            );

            // 2. Notificación al cliente (Cambio de estado)
            if (oldOrder.estado !== newOrder.estado && isMyOrder) {
              NotificationService.notifyOrderStatus(
                newOrder.ID_Pedido,
                newOrder.estado,
                null
              );
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
