import { CONFIG } from '../constants/Config';

/**
 * Utility to resolve sheet data and ensure it's in a consistent format
 */
const resolveSheetData = (data, sheetName) => {
  if (!data) return [];
  if (data.status === 'success' && data.data) return data.data;
  if (Array.isArray(data)) return data;
  if (data[sheetName]) return data[sheetName];
  return [];
};

/**
 * Utility to safe-get properties regardless of case
 */
const getRobustProp = (obj, propName) => {
  if (!obj) return null;
  if (obj[propName] !== undefined) return obj[propName];
  
  const lowerProp = propName.toLowerCase();
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerProp);
  return foundKey ? obj[foundKey] : null;
};

/**
 * Fetch products from Google Sheets
 */
export const fetchProducts = async () => {
  try {
    const url = `${CONFIG.GAS_API_URL}?sheet=productos`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return resolveSheetData(data, 'productos');
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

/**
 * Search products by name or description
 */
export const searchProducts = (products, query) => {
  if (!query) return products;
  const lowerQuery = query.toLowerCase();
  return products.filter(product => 
    (getRobustProp(product, 'Nombre') || '').toLowerCase().includes(lowerQuery) ||
    (getRobustProp(product, 'Descripcion') || '').toLowerCase().includes(lowerQuery)
  );
};

/**
 * Filter products by category
 */
export const filterProductsByCategory = (products, category) => {
  if (!category || category === 'All') return products;
  return products.filter(product => getRobustProp(product, 'Categoria') === category);
};

/**
 * Filter products by subcategory
 */
export const filterProductsBySubcategory = (products, subcategory) => {
  if (!subcategory || subcategory === 'All') return products;
  return products.filter(product => getRobustProp(product, 'Subcategoria') === subcategory);
};

/**
 * Advanced filters for products
 */
export const advancedFilters = (products, filters) => {
  let filtered = [...products];
  
  if (filters.category && filters.category !== 'All') {
    filtered = filtered.filter(p => getRobustProp(p, 'Categoria') === filters.category);
  }
  
  if (filters.priceRange) {
    filtered = filtered.filter(p => {
      const price = parseFloat(getRobustProp(p, 'Precio')) || 0;
      return price >= filters.priceRange.min && price <= filters.priceRange.max;
    });
  }
  
  return filtered;
};

/**
 * Sort products based on criteria
 */
export const sortProducts = (products, sortBy) => {
  const sorted = [...products];
  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => (parseFloat(getRobustProp(a, 'Precio')) || 0) - (parseFloat(getRobustProp(b, 'Precio')) || 0));
    case 'price-desc':
      return sorted.sort((a, b) => (parseFloat(getRobustProp(b, 'Precio')) || 0) - (parseFloat(getRobustProp(a, 'Precio')) || 0));
    case 'name-asc':
      return sorted.sort((a, b) => (getRobustProp(a, 'Nombre') || '').localeCompare(getRobustProp(b, 'Nombre') || ''));
    default:
      return sorted;
  }
};

/**
 * Get unique categories from product list
 */
export const getCategories = (products) => {
  const categories = products.map(p => getRobustProp(p, 'Categoria')).filter(Boolean);
  return ['All', ...new Set(categories)];
};

/**
 * Get unique subcategories for a category
 */
export const getSubcategories = (products, category) => {
  const filtered = category && category !== 'All' 
    ? products.filter(p => getRobustProp(p, 'Categoria') === category)
    : products;
  const subs = filtered.map(p => getRobustProp(p, 'Subcategoria')).filter(Boolean);
  return ['All', ...new Set(subs)];
};

/**
 * Stats and analysis functions
 */
export const getProductStats = (products) => {
  return {
    total: products.length,
    avgPrice: products.reduce((acc, p) => acc + (parseFloat(getRobustProp(p, 'Precio')) || 0), 0) / products.length,
    categories: getCategories(products).length - 1
  };
};

/**
 * Data validation helpers
 */
export const validateProduct = (product) => {
  return !!(getRobustProp(product, 'Nombre') && getRobustProp(product, 'Precio'));
};

/**
 * Price formatting
 */
export const formatPrice = (price) => {
  if (price === undefined || price === null) return '$0.00';
  return `$${parseFloat(price).toFixed(2)}`;
};

/**
 * Calculate price after discount
 */
export const calculateDiscountedPrice = (price, discountPercent) => {
  if (!discountPercent) return price;
  return price * (1 - discountPercent / 100);
};

/**
 * Generate unique order number
 */
export const generateOrderNumber = () => {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * Map product data to UI model
 */
export const mapProductData = (item) => ({
  id: getRobustProp(item, 'ID') || Math.random().toString(),
  name: getRobustProp(item, 'Nombre') || 'Producto',
  price: parseFloat(getRobustProp(item, 'Precio')) || 0,
  image: getRobustProp(item, 'Imagen') || null,
  description: getRobustProp(item, 'Descripcion') || ''
});

/**
 * Fetch business information
 */
export const fetchBusinessInfo = async () => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=config`);
    const data = await response.json();
    return resolveSheetData(data, 'config');
  } catch (error) {
    console.error('Error fetching business info:', error);
    return null;
  }
};

/**
 * Fetch order details for a specific order ID
 */
export const fetchOrderDetails = async (orderId) => {
  try {
    const url = `${CONFIG.GAS_API_URL}?sheet=pedido detalle&ID_Pedido=${orderId}`;
    const response = await fetch(url);
    const data = await response.json();
    return resolveSheetData(data, 'pedido detalle');
  } catch (error) {
    console.error('Error fetching order details:', error);
    return [];
  }
};

/**
 * Fetch active deliveries
 */
export const fetchDeliveries = async () => {
  try {
    const url = `${CONFIG.GAS_API_URL}?sheet=domicilio`;
    const response = await fetch(url);
    const data = await response.json();
    return resolveSheetData(data, 'domicilio');
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return [];
  }
};

/**
 * Update delivery status
 */
export const updateDelivery = async (deliveryId, status) => {
  try {
    const payload = {
      action: "updateDelivery",
      sheet: "domicilio",
      data: { id: deliveryId, status: status }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating delivery:', error);
    throw error;
  }
};

/**
 * Fetch all active orders for the Kitchen Display System (KDS)
 * Reads from the sheet 'pedidos'
 */
export const fetchKitchenOrders = async () => {
  try {
    const url = `${CONFIG.GAS_API_URL}?sheet=pedidos`;
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error('No se pudo leer pedidos');
    const rawData = await response.json();
    const orders = resolveSheetData(rawData, 'pedidos');
    
    return orders
      .filter(order => {
        const salida = getRobustProp(order, 'Salida');
        return !salida || salida === '';
      })
      .map(order => ({
        id: getRobustProp(order, 'ID_Pedido') || Math.random().toString(),
        cliente: getRobustProp(order, 'Cliente') || 'Invitado',
        items: [],
        estado: 'pending',
        hora: getRobustProp(order, 'Entrada') || '',
        total: parseFloat(getRobustProp(order, 'Total')) || 0,
      }));
  } catch (error) {
    console.error('Error in fetchKitchenOrders:', error);
    return [];
  }
};

/**
 * Update order status inside 'pedidos' sheet
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const payload = {
      action: "UPDATE",
      sheet: "pedidos",
      data: {
        'ID_Pedido': orderId,
        'Salida': (newStatus === 'delivered' || newStatus === 'completado') ? new Date().toLocaleTimeString() : ''
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
};

/**
 * Save order to the 'pedidos' sheet
 */
export const saveOrder = async (orderData) => {
  try {
    const payload = {
      action: "ADD",
      sheet: "pedidos",
      data: {
        'ID_Pedido': orderData.orderId,
        'Cliente': orderData.cliente || 'Invitado',
        'Total': orderData.total,
        'Entrada': orderData.hora || new Date().toLocaleTimeString(),
        'fecha': new Date().toLocaleDateString(),
        'Pagado?': 'NO'
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving order:', error);
    throw error;
  }
};

/**
 * Save item for a waiter session
 */
export const saveWaiterCartItem = async (waiterItem) => {
  try {
    const payload = {
      action: "ADD",
      sheet: "meseros_pedidos",
      data: waiterItem
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving waiter item:', error);
    throw error;
  }
};

/**
 * Fetch active waiter sessions
 */
export const fetchWaiterActiveSessions = async () => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=meseros_vivos`);
    const data = await response.json();
    return resolveSheetData(data, 'meseros_vivos');
  } catch (error) {
    console.error('Error fetching waiter sessions:', error);
    return [];
  }
};

/**
 * Get user role by email
 */
export const fetchUserRoleByEmail = async (email) => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=usuarios&email=${email}`);
    const data = await response.json();
    const users = resolveSheetData(data, 'usuarios');
    const user = users.find(u => getRobustProp(u, 'EmailUser') === email);
    return getRobustProp(user, 'UserType') || 'client';
  } catch (error) {
    return 'client';
  }
};

/**
 * Fetch all users
 */
export const fetchAllUsers = async () => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=usuarios`);
    const data = await response.json();
    return resolveSheetData(data, 'usuarios');
  } catch (error) {
    return [];
  }
};

/**
 * Save or update user
 */
export const saveUser = async (userData) => {
  try {
    const payload = {
      action: "UPDATE",
      sheet: "usuarios",
      data: {
        'ID_User': userData.id,
        'NombreUser': userData.username,
        'UserType': userData.role
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export default {
  fetchProducts,
  searchProducts,
  filterProductsByCategory,
  filterProductsBySubcategory,
  advancedFilters,
  sortProducts,
  getCategories,
  getSubcategories,
  getProductStats,
  validateProduct,
  formatPrice,
  calculateDiscountedPrice,
  generateOrderNumber,
  mapProductData,
  fetchBusinessInfo,
  fetchOrderDetails,
  fetchDeliveries,
  updateDelivery,
  fetchKitchenOrders,
  updateOrderStatus,
  saveOrder,
  saveWaiterCartItem,
  fetchWaiterActiveSessions,
  fetchUserRoleByEmail,
  fetchAllUsers,
  saveUser
};