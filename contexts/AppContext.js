import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { 
  fetchProducts, 
  fetchSuggestedProducts, 
  mapSuggestedProductData,
  fetchBusinessInfo, 
  saveWaiterCartItem, 
  fetchAllUsers, 
  fetchKitchenOrders, 
  fetchDeliveries, 
  fetchTables 
} from '../utils/api';
import { useUser } from './UserContext';
import { useAuth } from './AuthContext';

// Context para productos
export const ProductsContext = createContext();

// Context para carrito
export const CartContext = createContext();

// 🌐 CONTEXTO DE SINCRONIZACIÓN GLOBAL
export const DataSyncContext = createContext();

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [isEditorMode, setIsEditorMode] = useState(false);

  const fetchProductsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [productsData, suggestedData] = await Promise.all([
        fetchProducts(),
        fetchSuggestedProducts()
      ]);
      
      setProducts(productsData || []);
      setSuggestedProducts((suggestedData || []).map(mapSuggestedProductData));
      setLastFetch(new Date().toISOString());
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, []);

  // Get products by category
  const getProductsByCategory = (category) => {
    if (!category || category === 'all') return products;
    return products.filter(product => 
      product.categoria?.toLowerCase() === category.toLowerCase()
    );
  };

  // Get products by subcategory
  const getProductsBySubcategory = (subcategory) => {
    if (!subcategory || subcategory === 'all') return products;
    return products.filter(product => 
      product.subcategoria?.toLowerCase() === subcategory.toLowerCase()
    );
  };

  // Get featured products (recommended, best sellers, etc.)
  const getFeaturedProducts = () => {
    return products.filter(product => 
      product.recomendado || product.masVendido || product.delaCasa
    );
  };

  // Get products on offer
  const getOffersProducts = () => {
    return products.filter(product => 
      product.enOferta || product.descuento > 0
    );
  };

  // Get available products only
  const getAvailableProducts = () => {
    return products.filter(product => product.disponible);
  };

  // Get categories with product counts
  const getCategoriesWithCounts = () => {
    const categoryMap = {};
    products.forEach(product => {
      const category = product.categoria;
      if (category) {
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryMap).map(([name, count]) => ({
      name,
      count,
      available: products.filter(p => 
        p.categoria === name && p.disponible
      ).length
    }));
  };

  // Get product statistics
  const getProductStats = () => {
    const total = products.length;
    const available = products.filter(p => p.disponible).length;
    const outOfStock = products.filter(p => p.agotado).length;
    const onOffer = products.filter(p => p.enOferta).length;
    const recommended = products.filter(p => p.recomendado).length;
    const bestSellers = products.filter(p => p.masVendido).length;
    const houseSpecials = products.filter(p => p.delaCasa).length;
    
    return {
      total,
      available,
      outOfStock,
      onOffer,
      recommended,
      bestSellers,
      houseSpecials,
      categories: new Set(products.map(p => p.categoria).filter(Boolean)).size
    };
  };

  const value = React.useMemo(() => ({
    products,
    suggestedProducts,
    isLoading,
    error,
    lastFetch,
    refetchProducts: fetchProductsData,
    isEditorMode,
    setIsEditorMode,
    
    // Helper functions
    getProductsByCategory,
    getProductsBySubcategory,
    getFeaturedProducts,
    getOffersProducts,
    getAvailableProducts,
    getCategoriesWithCounts,
    getProductStats,
  }), [products, suggestedProducts, isLoading, error, lastFetch, isEditorMode]);

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};

// Provider para carrito
export const CartProvider = ({ children }) => {
  const { user } = useAuth(); // Importamos useAuth para vigilar el cambio de usuario real
  const { role, username } = useUser();
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState('cash');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para la sesión activa del mesero (Mesa/Cliente)
  const [waiterActiveSession, setWaiterActiveSession] = useState(null);

  // 🛡️ EFECTO CORTAFUEGOS INTELIGENTE:
  // Solo limpia si hay un CAMBIO REAL de cuenta (Usuario A -> Usuario B)
  const prevUserRef = React.useRef(user?.uid);
  
  useEffect(() => {
    const handleUserChange = async () => {
      // Si antes había un usuario y ahora hay otro DISTINTO, o si se cerró sesión
      if (prevUserRef.current && prevUserRef.current !== user?.uid) {
        console.log('🛡️ Cambio de cuenta real detectado. Limpiando datos del usuario anterior...');
        setCart([]);
        setWaiterActiveSession(null);
        setPaymentType('cash');
        try {
          await AsyncStorage.removeItem('@dsicario_cart');
          await AsyncStorage.removeItem('@dsicario_waiter_session');
        } catch (e) {}
      }
      prevUserRef.current = user?.uid;
    };
    
    handleUserChange();
  }, [user?.uid]);
  
  // Información del Negocio — cargada dinámicamente desde la hoja USUARIOS
  const [businessInfo, setBusinessInfo] = useState({
    name: 'DSicario',
    phone: '809-000-0000',
    email: 'ventas@dsicario.com',
    address: 'República Dominicana',
    logo: null,
    appLink: null,
    closed: false,
  });

  const [exchangeRates, setExchangeRates] = useState({ USD: 58.00, EUR: 63.00, COP: 0.015, MXN: 3.50 });

  // Cargar info del negocio al montar
  useEffect(() => {
    fetchBusinessInfo()
      .then(info => {
        setBusinessInfo(info);
        console.log('Negocio cargado:', info.name);
      })
      .catch(err => console.warn('Info negocio no disponible:', err.message));
      
    // Cargar tasas de cambio
    AsyncStorage.getItem('@dsicario_exchange_rates').then(rates => {
      if (rates) setExchangeRates(JSON.parse(rates));
    });
  }, []);

  const updateExchangeRates = async (newRates) => {
    setExchangeRates(newRates);
    await AsyncStorage.setItem('@dsicario_exchange_rates', JSON.stringify(newRates));
  };

  // Load cart from storage
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem('@dsicario_cart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          const migratedCart = parsedCart.map(item => {
            const id = item.id || item.ID_Producto || item.id_producto || `prod_${Math.random().toString(36).substr(2, 9)}`;
            const isPre = !!item.isPreOrder;
            const note = (item.orderNote || '').trim();
            const cartItemId = item.cartItemId || `${id}_${isPre ? 'pre' : 'norm'}_${note}`;
            
            return {
              ...item,
              id, // Asegurar que tenga id
              cartItemId,
              precio: parseFloat(item.precio) || 0,
              quantity: parseInt(item.quantity) || 1
            };
          });
          setCart(migratedCart);
        }
      } catch (err) {
        console.error('Error loading cart:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCart();
  }, []);

  // Save cart to storage
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('@dsicario_cart', JSON.stringify(cart)).catch(err => 
        console.error('Error saving cart:', err)
      );
    }
  }, [cart, isLoaded]);

  const addToCart = async (product) => {
    // 🤵 LÓGICA DE MESERO (EN LA NUBE)
    const isForcedWaiterMode = (role === 'Mesero' || role === 'Admin') && waiterActiveSession;
    
    // Obtener campos de forma robusta
    const prodId = product.id || product.ID_Producto || product.id_producto;
    const prodNombre = product.nombre || product.Nombre;
    const prodPrecio = parseFloat(product.precio || product.Precio) || 0;

    if (isForcedWaiterMode && (role === 'Mesero' || role === 'Admin')) {
      if (!waiterActiveSession) {
        Alert.alert('⚠️ Sin Sesión', 'Debes abrir una mesa/sesión en el POS antes de agregar productos.');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await saveWaiterCartItem({
          id_carrito: waiterActiveSession.id_carrito,
          id_producto: prodId,
          nombre: prodNombre,
          precio: prodPrecio,
          cantidad: product.quantity || 1,
          total_producto: (prodPrecio * (product.quantity || 1)),
          cliente: waiterActiveSession.cliente,
          usuario: username,
          orderNote: product.orderNote || '',
          rating: product.rating || 0,
          fecha: new Date().toISOString()
        });

        if (result.success) {
          Alert.alert('✅ Agregado', `${prodNombre} añadido a la orden de ${waiterActiveSession.cliente}.`);
        } else {
          throw new Error(result.error || 'Error al guardar en el servidor');
        }
      } catch (error) {
        console.error('Add to cloud cart fail:', error);
        Alert.alert('❌ Error', 'No se pudo sincronizar el pedido. Revisa tu conexión.');
      } finally {
        setIsSubmitting(false);
      }
      return; 
    }

    // 👤 LÓGICA DE CLIENTE (LOCAL)
    setCart((prevCart) => {
      const note = (product.orderNote || '').trim();
      const isPre = !!product.isPreOrder;
      // Generar una clave única para este item en el carrito
      const cartItemId = `${prodId}_${isPre ? 'pre' : 'norm'}_${note}`;
      
      const existingItem = prevCart.find(item => item.cartItemId === cartItemId);
      
      if (existingItem) {
        return prevCart.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + (product.quantity || 1) }
            : item
        );
      } else {
        return [...prevCart, { 
          ...product, 
          quantity: product.quantity || 1, 
          id: prodId, 
          cartItemId, 
          isPreOrder: isPre 
        }];
      }
    });
  };

  const removeFromCart = (cartItemId) => {
    setCart((prevCart) => prevCart.filter((item) => {
      const id = item.cartItemId || `${item.id || item.ID_Producto}_${item.isPreOrder ? 'pre' : 'norm'}_${(item.orderNote || '').trim()}`;
      return id !== cartItemId;
    }));
  };

  const updateCartItemQuantity = (cartItemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    
    setCart((prevCart) =>
      prevCart.map(item => {
        const currentId = item.cartItemId || `${item.id || item.ID_Producto}_${item.isPreOrder ? 'pre' : 'norm'}_${(item.orderNote || '').trim()}`;
        return currentId === cartItemId
          ? { ...item, quantity, cartItemId: currentId }
          : item;
      })
    );
  };

  const updateCartItemNote = (cartItemId, note) => {
    setCart((prevCart) =>
      prevCart.map(item => {
        if (item.cartItemId === cartItemId) {
          const id = item.id || item.ID_Producto || item.id_producto;
          const isPre = !!item.isPreOrder;
          const newNote = (note || '').trim();
          const newCartId = `${id}_${isPre ? 'pre' : 'norm'}_${newNote}`;
          return { ...item, orderNote: note, cartItemId: newCartId };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalCost = () => {
    return cart.reduce((total, item) => {
      const price = parseFloat(item.precio) || 0;
      const discount = parseFloat(item.descuento) || 0;
      const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
      return total + (finalPrice * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalSavings = () => {
    return cart.reduce((total, item) => {
      const price = parseFloat(item.precio) || 0;
      const discount = parseFloat(item.descuento) || 0;
      if (discount > 0) {
        const savings = price * (discount / 100) * item.quantity;
        return total + savings;
      }
      return total;
    }, 0);
  };

  // Get cart summary with detailed information
  const getCartSummary = () => {
    const totalItems = getTotalItems();
    const totalCost = getTotalCost();
    const totalSavings = getTotalSavings();
    const originalTotal = cart.reduce((total, item) => {
      const price = parseFloat(item.precio) || 0;
      return total + (price * item.quantity);
    }, 0);

    return {
      items: cart,
      totalItems,
      totalCost,
      totalSavings,
      originalTotal,
      uniqueProducts: cart.length,
      isEmpty: cart.length === 0,
      hasDiscounts: totalSavings > 0
    };
  };

  // Check if product is in cart
  const isInCart = (productId) => {
    return cart.some(item => item.id === productId);
  };

  // Get quantity of specific product in cart
  const getProductQuantity = (productId) => {
    const item = cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  const cartValue = React.useMemo(() => ({
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItemNote,
    clearCart,
    getTotalCost,
    getTotalItems,
    getTotalSavings,
    getCartSummary,
    isInCart,
    getProductQuantity,
    paymentType,
    setPaymentType,
    businessInfo,
    waiterActiveSession,
    setWaiterActiveSession,
    saveWaiterCartItem,
    isSubmitting,
    exchangeRates,
    updateExchangeRates
  }), [cart, paymentType, isLoaded, isSubmitting, businessInfo, waiterActiveSession, exchangeRates]);



  return (
    <CartContext.Provider value={cartValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hooks
export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// --- DATA SYNC PROVIDER ---
export const DataSyncProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [deliveries, setDeliveries] = useState([]); const [tables, setTables] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false); // Por defecto OFF para que el usuario sea quien lo active la primera vez

  const syncAllData = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    console.log('🔄 Iniciando Sincronización Global...');
    try {
      const [usersData, kitchenData, deliveriesData, tablesData] = await Promise.all([
        fetchAllUsers().catch(e => { console.error('Error users:', e); return []; }),
        fetchKitchenOrders().catch(e => { console.error('Error kitchen:', e); return []; }),
        fetchDeliveries().catch(e => { console.error('Error deliveries:', e); return []; }),
        fetchTables().catch(e => { console.error('Error tables:', e); return []; })
      ]);

      setUsers(usersData);
      setKitchenOrders(kitchenData);
      setDeliveries(deliveriesData);
      setTables(tablesData);
      
      setLastSync(new Date().toISOString());
      console.log('✅ Sincronización Global Exitosa');
    } catch (error) {
      console.error('❌ Error en Sincronización:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncAllData();
  }, []);

  useEffect(() => {
    let intervalId = null;
    if (isAutoSyncEnabled) {
      syncAllData();
      intervalId = setInterval(syncAllData, 30000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isAutoSyncEnabled]);

  const value = React.useMemo(() => ({
    users,
    deliveries,
    tables,
    kitchenOrders,
    isSyncing,
    lastSync,
    syncAllData,
    isAutoSyncEnabled,
    setIsAutoSyncEnabled,
    setUsers,
    setDeliveries,
    setTables,
    setKitchenOrders
  }), [users, deliveries, tables, kitchenOrders, isSyncing, lastSync, isAutoSyncEnabled]);

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
};

export const useDataSync = () => {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within a DataSyncProvider');
  }
  return context;
};






