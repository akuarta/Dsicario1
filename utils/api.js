import { CONFIG } from '../constants/Config';

const API_BASE_URL = CONFIG.GAS_API_URL;
const PRODUCTS_ENDPOINT = `${API_BASE_URL}`; // Quitamos el /exec extra

// API response timeout
const API_TIMEOUT = CONFIG.API_TIMEOUT; // Increased for Google Apps Script

/**
 * 🛠️ UTILERÍA DE RESILIENCIA UNIVERSAL
 * Normaliza claves y busca en el objeto ignorando mayúsculas, espacios y acentos.
 */
const normalizeString = (s) => String(s || '').toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[?()\s./-]/g, "");

const getRobustProp = (obj, targetKey) => {
  if (!obj || !targetKey) return undefined;
  
  // 1. Intento directo
  if (obj[targetKey] !== undefined) return obj[targetKey];
  
  // 2. Diccionario de Sinónimos Universales para DSicario
  const synonyms = {
    id: ['id_producto', 'id_orden', 'id_user', 'id_delivery', 'orderid', 'id_carrito', 'codigo'],
    nombre: ['name', 'nombreuser', 'producto', 'cliente', 'repartidor'],
    precio: ['price', 'valor', 'total', 'subtotal', 'costo'],
    estado: ['status', 'state', 'currentstatus', 'condicion'],
    cantidad: ['quantity', 'qty', 'num', 'cantidad_items'],
    items: ['productos', 'lista_productos', 'carro', 'items_pedido'],
    usuario: ['user', 'emailuser', 'login', 'email'],
  };

  const target = normalizeString(targetKey);
  const keys = Object.keys(obj);
  
  // Buscar en el objeto si alguna clave normalizada coincide con el target normalizado
  // o si el target está en el diccionario de sinónimos de alguna clave real del objeto
  const foundKey = keys.find(k => {
    const nk = normalizeString(k);
    if (nk === target) return true;
    // Revisar si la clave 'k' es un sinónimo conocido del 'target'
    for (const [standard, list] of Object.entries(synonyms)) {
      if (standard === target && list.includes(nk)) return true;
    }
    return false;
  });

  return foundKey ? obj[foundKey] : undefined;
};

/**
 * Busca inteligentemente una 'hoja' en la respuesta global de la API
 */
const resolveSheetData = (rawData, sheetName) => {
  if (!rawData) return [];
  const target = normalizeString(sheetName);
  const keys = Object.keys(rawData);
  const foundKey = keys.find(k => normalizeString(k).includes(target));
  const data = foundKey ? rawData[foundKey] : (rawData.data || []);
  return Array.isArray(data) ? data : [];
};
const fetchWithTimeout = (url, options = {}, timeout = API_TIMEOUT) => {
  return Promise.race([
    fetch(url, { ...options, mode: 'no-cors' }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

const mapProductData = (apiProduct) => {
  if (!apiProduct) return null;

  // 🎯 MAPEADO ROBUSTO (Resiliente a cambios en el Excel)
  const idValue = getRobustProp(apiProduct, 'ID_Producto') || getRobustProp(apiProduct, 'id_producto');
  const nombreValue = getRobustProp(apiProduct, 'nombre');
  let precioValue = getRobustProp(apiProduct, 'precio') || 0;
  
  if (typeof precioValue === 'string') {
    precioValue = parseFloat(precioValue.replace(/[^0-9.]/g, '')) || 0;
  }

  // 🏳️ NORMALIZACIÓN DE FLAGS (Mapeo flexible)
  const sugerido = getRobustProp(apiProduct, 'recomendados') === true || getRobustProp(apiProduct, 'recomendado') === true;
  const topVentas = getRobustProp(apiProduct, 'masVendidos') === true || getRobustProp(apiProduct, 'masVendido') === true;
  const oferta = getRobustProp(apiProduct, 'enOferta') === true || getRobustProp(apiProduct, 'enoferta') === true;
  const casa = getRobustProp(apiProduct, 'delaCasa') === true || getRobustProp(apiProduct, 'delacasa') === true;
  const estaAgotado = getRobustProp(apiProduct, 'agotado') === true;

  return {
    ...apiProduct, 
    id: idValue ? String(idValue) : Math.random().toString(),
    nombre: nombreValue ? String(nombreValue) : 'Producto',
    descripcion: getRobustProp(apiProduct, 'descripcion') || '',
    precio: parseFloat(precioValue),
    itebis: parseFloat(getRobustProp(apiProduct, 'itebis') || 0) || 0,
    stock: parseInt(getRobustProp(apiProduct, 'cantidad') || getRobustProp(apiProduct, 'stock') || 0) || 0,
    categoria: getRobustProp(apiProduct, 'categoria') || 'General',
    subcategoria: getRobustProp(apiProduct, 'subcategoria') || '',
    imagen: getRobustProp(apiProduct, 'imagen') || 'https://via.placeholder.com/300x200?text=Sin+Imagen',
    
    // Flags normalizados para ProductListScreen.js
    recomendado: sugerido,
    masVendido: topVentas,
    enOferta: oferta,
    delaCasa: casa,
    agotado: estaAgotado,
    disponible: !estaAgotado,
    rating: parseFloat(getRobustProp(apiProduct, 'rating')) || 0,
    descuento: parseFloat(getRobustProp(apiProduct, 'descuento') || 0) || 0
  };
};

/**
 * Fetch products from Google Apps Script API
 * @returns {Promise<Array>} Array of products
 */
export const fetchProducts = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    console.log('Fetching products from Google Apps Script API...');
    const response = await fetch(`${PRODUCTS_ENDPOINT}?sheet=hoja1`, { 
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'follow'
    });

    clearTimeout(timeout);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const rawData = await response.json();
    
    // 🏷️ SELECTOR DE DATOS ROBUSTO
    const productsData = getRobustProp(rawData, 'Hoja1') || getRobustProp(rawData, 'Producto') || getRobustProp(rawData, 'data') || [];

    if (!Array.isArray(productsData)) {
      console.warn('⚠️ No se recibió un array de productos. Estructura:', Object.keys(rawData));
      return [];
    }

    const mappedProducts = productsData
      .map(mapProductData)
      .filter(p => p !== null && p.nombre && p.nombre !== 'undefined');

    console.log(`✅ Sincronización Exitosa: ${mappedProducts.length} productos listos para mostrar.`);
    return mappedProducts;
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error fetching products:', error);
    return [];
  }
};

/**
 * Fetch business info from Google Apps Script (hoja de configuración)
 * Reads from the sheet that contains: NombreLocal, TelefonoLocal, DireccionLocal, EmailLocal, etc.
 * @returns {Promise<Object>} Business info object
 */
export const fetchBusinessInfo = async () => {
  try {
    console.log('Fetching business info...');
    const url = `${API_BASE_URL}?sheet=principal`;
    const response = await fetch(url, {
      credentials: 'omit',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error('No se pudo leer la hoja de configuración');
    const rawData = await response.json();
    console.log('Business info raw:', rawData);

    const rows = getRobustProp(rawData, 'Principal') || getRobustProp(rawData, 'data') || rawData;
    const row = Array.isArray(rows) ? rows[0] : rows;

    if (!row) throw new Error('No hay datos de configuración del negocio');

    return {
      name:    getRobustProp(row, 'NombreLocal')    || 'DSicarioApp',
      phone:   getRobustProp(row, 'TelefonoLocal')  || '809-000-0000',
      email:   getRobustProp(row, 'EmailLocal')     || 'ventas@dsicario.com',
      address: getRobustProp(row, 'DireccionLocal') || 'República Dominicana',
      logo:    getRobustProp(row, 'Logo')           || null,
      appLink: getRobustProp(row, 'Link App')       || getRobustProp(row, 'appLink'),
      closed:  getRobustProp(row, 'Cerrado?')       || false,
    };
  } catch (error) {
    console.warn('Usando info de negocio predeterminada:', error.message);
    // Fallback a valores predeterminados si falla la conexión
    return {
      name:    'DSicarioApp',
      phone:   '809-000-0000',
      email:   'ventas@dsicario.com',
      address: 'República Dominicana',
      logo:    null,
      appLink: null,
      closed:  false,
    };
  }
};

/**
 * Fetch order details from Google Apps Script (hoja Inventario D'Sicario)
 * @param {string} orderId - Order ID to search for
 * @returns {Promise<Object>} Order details object
 */
export const fetchOrderDetails = async (orderId) => {
  try {
    console.log(`Fetching details for order ${orderId}...`);
    const url = `${API_BASE_URL}?sheet=inventario`;
    const response = await fetch(url, {
      credentials: 'omit',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error('No se pudo leer la hoja de inventario');
    const rawData = await response.json();
    
    const orders = getRobustProp(rawData, 'Inventario') || getRobustProp(rawData, 'data') || [];
    const order = Array.isArray(orders) ? orders.find(o => 
      (getRobustProp(o, 'ID_Orden') && getRobustProp(o, 'ID_Orden').toString() === orderId.toString()) || 
      (getRobustProp(o, 'orderId') && getRobustProp(o, 'orderId').toString() === orderId.toString())
    ) : null;

    if (!order) {
      console.log('Pedido no encontrado en la hoja, usando datos de demostración');
      return {
        orderId: orderId,
        cliente: 'Invitado Especial',
        direccion: 'Calle Principal #123, Ensanche La Fe',
        estado: 'on_the_way',
        eta: '15 - 20 min',
        rider: 'Juan Pérez',
        riderRating: 4.9,
        progreso: 0.7,
        telefonoRider: '809-555-0123'
      };
    }

    return {
      orderId: getRobustProp(order, 'ID_Orden') || orderId,
      cliente: getRobustProp(order, 'Cliente') || 'Cliente',
      direccion: getRobustProp(order, 'Direccion') || 'Dirección no especificada',
      estado: getRobustProp(order, 'Estado') || 'preparing',
      eta: getRobustProp(order, 'ETA') || '30 - 40 min',
      rider: getRobustProp(order, 'Rider') || 'Delivery Asignado',
      riderRating: parseFloat(getRobustProp(order, 'RiderRating') || getRobustProp(order, 'rating')) || 5.0,
      progreso: parseFloat(getRobustProp(order, 'Progreso') || getRobustProp(order, 'progreso')) || 0.3,
      telefonoRider: getRobustProp(order, 'TelefonoRider') || '809-000-0000'
    };
  } catch (error) {
    console.warn('Error al obtener detalles del pedido, usando fallback:', error.message);
    return {
      orderId: orderId,
      cliente: 'Cliente Valorado',
      direccion: 'República Dominicana',
      estado: 'preparing',
      eta: '-- min',
      rider: 'Asignando...',
      riderRating: 5.0,
      progreso: 0.1
    };
  }
};

/**
 * Fetch delivery personnel (Repartidores) from Google Apps Script
 * Reads from the sheet 'Deliverys'
 * @returns {Promise<Array>} Array of delivery objects
 */
export const fetchDeliveries = async () => {
  try {
    console.log('Fetching deliveries info...');
    const url = `${API_BASE_URL}?sheet=deliverys`;
    const response = await fetch(url, {
      credentials: 'omit',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error('No se pudo descargar la lista de repartidores');
    const rawData = await response.json();
    
    const rows = resolveSheetData(rawData, 'deliverys') || resolveSheetData(rawData, 'data') || rawData;
    
    if (!Array.isArray(rows)) return [];

    return rows.map((row, index) => ({
      id: String(getRobustProp(row, 'ID_Delivery') || index),
      id_delivery: String(getRobustProp(row, 'ID_Delivery') || `DS0${index}`),
      nombre: getRobustProp(row, 'Nombre(s)') || getRobustProp(row, 'Nombre') || 'Sin',
      apellido: getRobustProp(row, 'Apellido(S)') || getRobustProp(row, 'Apellido') || 'Nombre',
      telefono: getRobustProp(row, 'Telefono(s)') || getRobustProp(row, 'Telefono') || '',
      whatsapp: getRobustProp(row, 'Whatsapp') || '',
      vehiculo: getRobustProp(row, 'Vehiculo') || '',
      costo_pedido: getRobustProp(row, 'Costo/Pedido(s)') || '0',
      cartera: parseFloat(getRobustProp(row, 'Cartera')) || 0,
      rapidez: parseFloat(getRobustProp(row, 'Rapidez')) || 5.0,
      servicio: parseFloat(getRobustProp(row, 'Servicio/Cliente') || getRobustProp(row, 'Servicio')) || 5.0,
      honestidad: parseFloat(getRobustProp(row, 'Honstidad') || getRobustProp(row, 'Honestidad')) || 5.0,
      activo: String(getRobustProp(row, 'Activo') || '').toLowerCase() === 'si' || true,
      foto: getRobustProp(row, 'Foto Perfil') || getRobustProp(row, 'Foto') || ''
    })).filter(d => d.nombre !== 'Sin');

  } catch (error) {
    console.error('Error fetching deliveries:', error);
    throw error;
  }
};

/**
 * Enviar actualización de repartidor a Google Apps Script
 * Esto incluye mandar la foto base64 para que el servidor la suba a Drive.
 */
export const updateDelivery = async (deliveryData) => {
  try {
    const payload = {
      action: "updateDelivery",
      sheet: "deliverys",
      data: {
        'ID_Delivery': deliveryData.id_delivery,
        'Nombre(s)': deliveryData.nombre,
        'Apellido(S)': deliveryData.apellido,
        'Telefono(s)': deliveryData.telefono,
        'Whatsapp': deliveryData.whatsapp,
        'Vehiculo': deliveryData.vehiculo,
        'Costo/Pedido(s)': deliveryData.costo_pedido,
        'Cartera': deliveryData.cartera,
        'Rapidez': deliveryData.rapidez,
        'Servicio/Cliente': deliveryData.servicio,
        'Honstidad': deliveryData.honestidad,
        'Activo': deliveryData.activo ? 'SI' : 'NO',
        'Foto Perfil ': deliveryData.foto
      }
    };

    console.log(`Enviando actualización del repartidor ${deliveryData.id_delivery} con claves de Excel...`);
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Error al guardar en el Excel de Google');
    }

    return result;

  } catch (error) {
    console.error('Error actualizando repartidor:', error);
    throw error;
  }
};


/**
 * Search products by term (enhanced for new fields)
 * @param {Array} products - Array of products
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered products
 */
export const searchProducts = (products, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) {
    return products;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return products.filter(product => 
    (product.nombre || '').toLowerCase().includes(term) ||
    (product.categoria || '').toLowerCase().includes(term) ||
    (product.subcategoria || '').toLowerCase().includes(term) ||
    (product.descripcion || '').toLowerCase().includes(term)
  );
};

/**
 * Filter products by category
 * @param {Array} products - Array of products
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered products
 */
export const filterProductsByCategory = (products, category) => {
  if (!category || category === 'all') {
    return products;
  }
  
  return products.filter(product => 
    (product.categoria || '').toLowerCase() === category.toLowerCase()
  );
};

/**
 * Filter products by subcategory
 * @param {Array} products - Array of products
 * @param {string} subcategory - Subcategory to filter by
 * @returns {Array} Filtered products
 */
export const filterProductsBySubcategory = (products, subcategory) => {
  if (!subcategory || subcategory === 'all') {
    return products;
  }
  
  return products.filter(product => 
    (product.subcategoria || '').toLowerCase() === subcategory.toLowerCase()
  );
};

/**
 * Advanced filters for new API fields
 */
export const advancedFilters = {
  disponibles: (products) => products.filter(p => p.disponible),
  agotados: (products) => products.filter(p => p.agotado),
  masVendidos: (products) => products.filter(p => p.masVendido),
  delaCasa: (products) => products.filter(p => p.delaCasa),
  enOferta: (products) => products.filter(p => p.enOferta),
  recomendados: (products) => products.filter(p => p.recomendado),
  conDescuento: (products) => products.filter(p => p.descuento > 0),
  porRating: (products, minRating = 4) => products.filter(p => p.rating >= minRating),
};

/**
 * Sort products by different criteria (enhanced)
 * @param {Array} products - Array of products
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted products
 */
export const sortProducts = (products, sortBy) => {
  const sortedProducts = [...products];
  
  switch (sortBy) {
    case 'name':
      return sortedProducts.sort((a, b) => 
        (a.nombre || '').localeCompare(b.nombre || '')
      );
      
    case 'price-asc':
      return sortedProducts.sort((a, b) => 
        parseFloat(a.precio || 0) - parseFloat(b.precio || 0)
      );
      
    case 'price-desc':
      return sortedProducts.sort((a, b) => 
        parseFloat(b.precio || 0) - parseFloat(a.precio || 0)
      );
      
    case 'category':
      return sortedProducts.sort((a, b) => 
        (a.categoria || '').localeCompare(b.categoria || '')
      );
      
    case 'rating':
      return sortedProducts.sort((a, b) => 
        (b.rating || 0) - (a.rating || 0)
      );
      
    case 'popular':
      return sortedProducts.sort((a, b) => {
        // Prioritize: masVendido > recomendado > rating > name
        if (a.masVendido !== b.masVendido) return b.masVendido - a.masVendido;
        if (a.recomendado !== b.recomendado) return b.recomendado - a.recomendado;
        if (a.rating !== b.rating) return b.rating - a.rating;
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
      
    case 'offers':
      return sortedProducts.sort((a, b) => {
        // Prioritize: enOferta > descuento > price
        if (a.enOferta !== b.enOferta) return b.enOferta - a.enOferta;
        if (a.descuento !== b.descuento) return b.descuento - a.descuento;
        return parseFloat(a.precio || 0) - parseFloat(b.precio || 0);
      });
      
    default:
      return sortedProducts;
  }
};

/**
 * Get unique categories from products
 * @param {Array} products - Array of products
 * @returns {Array} Array of unique categories
 */
export const getCategories = (products) => {
  const categories = products
    .map(product => product.categoria)
    .filter(category => category && category.trim())
    .map(category => category.trim());
    
  return [...new Set(categories)].sort();
};

/**
 * Get unique subcategories from products
 * @param {Array} products - Array of products
 * @param {string} category - Optional category filter
 * @returns {Array} Array of unique subcategories
 */
export const getSubcategories = (products, category = null) => {
  let filteredProducts = products;
  
  if (category) {
    filteredProducts = products.filter(p => 
      (p.categoria || '').toLowerCase() === category.toLowerCase()
    );
  }
  
  const subcategories = filteredProducts
    .map(product => product.subcategoria)
    .filter(subcategory => subcategory && subcategory.trim())
    .map(subcategory => subcategory.trim());
    
  return [...new Set(subcategories)].sort();
};

/**
 * Get product statistics
 * @param {Array} products - Array of products
 * @returns {Object} Statistics object
 */
export const getProductStats = (products) => {
  const total = products.length;
  const disponibles = products.filter(p => p.disponible).length;
  const agotados = products.filter(p => p.agotado).length;
  const enOferta = products.filter(p => p.enOferta).length;
  const masVendidos = products.filter(p => p.masVendido).length;
  const recomendados = products.filter(p => p.recomendado).length;
  const delaCasa = products.filter(p => p.delaCasa).length;
  
  const avgRating = products.reduce((sum, p) => sum + (p.rating || 0), 0) / total;
  const avgPrice = products.reduce((sum, p) => sum + (parseFloat(p.precio) || 0), 0) / total;
  
  return {
    total,
    disponibles,
    agotados,
    enOferta,
    masVendidos,
    recomendados,
    delaCasa,
    avgRating: Math.round(avgRating * 10) / 10,
    avgPrice: Math.round(avgPrice * 100) / 100,
    categories: getCategories(products).length,
    subcategories: getSubcategories(products).length
  };
};

/**
 * Validate product data (enhanced)
 * @param {Object} product - Product object
 * @returns {boolean} True if valid
 */
export const validateProduct = (product) => {
  if (!product || typeof product !== 'object') {
    return false;
  }
  
  const requiredFields = ['id', 'nombre', 'precio'];
  
  return requiredFields.every(field => 
    product.hasOwnProperty(field) && 
    product[field] !== null && 
    product[field] !== undefined &&
    product[field] !== ''
  );
};

/**
 * Format price for display
 * @param {number|string} price - Price value
 * @param {string} currency - Currency symbol
 * @returns {string} Formatted price
 */
export const formatPrice = (price, currency = 'RD$') => {
  const numPrice = parseFloat(price) || 0;
  return `${currency}${numPrice.toFixed(2)}`;
};

/**
 * Calculate discounted price
 * @param {number} price - Original price
 * @param {number} discount - Discount percentage
 * @returns {number} Discounted price
 */
export const calculateDiscountedPrice = (price, discount) => {
  const originalPrice = parseFloat(price) || 0;
  const discountPercent = parseFloat(discount) || 0;
  
  if (discountPercent <= 0) return originalPrice;
  
  return originalPrice * (1 - discountPercent / 100);
};

/**
 * Generate order number
 * @returns {string} Order number
 */
export const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `DS${timestamp.slice(-6)}${random}`;
};

/**
 * Fetch all active orders for the Kitchen Display System (KDS)
 * Reads from the sheet 'COCINA'
 * @returns {Promise<Array>} Array of active orders
 */
export const fetchKitchenOrders = async () => {
  try {
    console.log('Fetching active kitchen orders from pedidos...');
    const url = `${CONFIG.GAS_API_URL}?sheet=pedidos`;
    const response = await fetch(url, {
      credentials: 'omit',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error('No se pudo leer la hoja de pedidos');
    const rawData = await response.json();
    const orders = resolveSheetData(rawData, 'pedidos');
    
    return orders
      .filter(order => {
        // En 'pedidos', si no hay 'Salida', el pedido está activo
        const salida = getRobustProp(order, 'Salida');
        return !salida || salida === '';
      })
      .map(order => ({
        id: getRobustProp(order, 'ID_Pedido') || Math.random().toString(),
        cliente: getRobustProp(order, 'Cliente') || 'Invitado',
        items: [], // En esta hoja no hay items, se cargan por ID_Pedido en detalle si es necesario
        estado: 'pending',
        hora: getRobustProp(order, 'Entrada') || '',
        notas: getRobustProp(order, 'Notas') || '',
        total: parseFloat(getRobustProp(order, 'Total')) || 0,
      }));
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    return [];
  }
};

/**
 * Update order status in Google Apps Script targeting pedidos sheet
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
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Fetch orders assigned to a specific rider
 * @param {string} riderId - ID of the rider
 */
export const fetchRiderOrders = async (riderId) => {
  try {
    const url = `${CONFIG.GAS_API_URL}?sheet=pedidos`;
    const response = await fetch(url, { redirect: 'follow' });
    const rawData = await response.json();
    const orders = resolveSheetData(rawData, 'pedidos');
    
    return orders.filter(o => {
      const resp = getRobustProp(o, 'Repartidor') || getRobustProp(o, 'Delivery') || '';
      const salida = getRobustProp(o, 'Salida');
      // Filtramos por repartidor y que no hayan salido todavía o que coincidan con el rider
      return (String(resp) === String(riderId)) && (!salida || salida === '');
    }).map(o => ({
      id: getRobustProp(o, 'ID_Pedido'),
      cliente: getRobustProp(o, 'Cliente'),
      total: parseFloat(getRobustProp(o, 'Total')) || 0,
      estado: getRobustProp(o, 'Salida') ? 'delivered' : 'preparing',
      items: [], 
      notas: getRobustProp(o, 'Notas') || '',
      hora: getRobustProp(o, 'Entrada') || '',
      whatsapp: getRobustProp(o, 'Whatsapp') || getRobustProp(o, 'Telefono') || ''
    }));
  } catch (error) {
    console.error('Error fetching rider orders:', error);
    return [];
  }
};

/**
 * Get rider statistics (Cartera vs Current Debt)
 * @param {string} riderId - ID of the rider
 */
export const fetchRiderStats = async (riderId) => {
  try {
    // 1. Obtener Cartera desde Deliverys
    const deliveries = await fetchDeliveries();
    const rider = deliveries.find(d => d.id_delivery === riderId || d.nombre === riderId);
    const cartera = parseFloat(rider ? rider.cartera : 0) || 0;

    // 2. Obtener Deuda Activa (Pedidos en curso)
    const activeOrders = await fetchRiderOrders(riderId);
    const deuda = activeOrders.reduce((acc, o) => acc + o.total, 0);

    return {
      cartera,
      deuda,
      cupo: cartera - deuda,
      nombre: rider ? `${rider.nombre} ${rider.apellido}` : 'Repartidor'
    };
  } catch (error) {
    console.error('Error fetching rider stats:', error);
    return { cartera: 0, deuda: 0, cupo: 0, nombre: 'Error' };
  }
};

/**
 * Save an item to a waiter's active session in PEDIDOS_CAMARERO
 * @param {Object} itemData - The denormalized item data matching user columns
 */
export const saveWaiterCartItem = async (itemData) => {
  try {
    const payload = {
      action: "updateDelivery", // Reusamos la acción de actualización genérica si el GAS lo permite, 
                                // pero mejor creamos una específica si el GAS la tiene.
                                // Por ahora enviamos a la hoja PEDIDOS_CAMARERO
      sheet: "pedidos_camarero",
      data: {
        'ID_Carrito': itemData.id_carrito,
        'ID_Pedido': itemData.id_pedido || '',
        'ID_Producto': itemData.id_producto,
        'Nombre': itemData.nombre,
        'Precio': itemData.precio,
        'Cantidad': itemData.cantidad,
        'Total Producto': itemData.total_producto,
        'Subtotal': itemData.subtotal || '',
        'ITBIS': itemData.itbis || '',
        'Descuentos': itemData.descuentos || '',
        'Total a pagar': itemData.total_pagar || '',
        'Cliente': itemData.cliente,
        'Usuario': itemData.usuario,
        'Notas': itemData.orderNote || itemData.notas || '',
        'Rating': itemData.rating || 0,
        'Fecha': itemData.fecha || new Date().toISOString()
      }
    };

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    return await response.json();
  } catch (error) {
    console.error('Error saving waiter cart item:', error);
    throw error;
  }
};

/**
 * Fetch all active cart sessions for a specific waiter
 * @param {string} waiterName - Name or ID of the waiter
 */
export const fetchWaiterActiveSessions = async (waiterName) => {
  try {
    const url = `${CONFIG.GAS_API_URL}?sheet=pedidos_camarero`;
    const response = await fetch(url);
    const rawData = await response.json();
    const rows = resolveSheetData(rawData, 'pedidos_camarero');

    // Agrupar filas por ID_Carrito
    const sessionsMap = rows.reduce((acc, row) => {
      const rowWaiter = getRobustProp(row, 'usuario');
      if (rowWaiter === waiterName || !waiterName) {
        const id = getRobustProp(row, 'id');
        if (!acc[id]) {
          acc[id] = {
            id_carrito: id,
            cliente: getRobustProp(row, 'nombre') || getRobustProp(row, 'cliente'),
            usuario: rowWaiter,
            fecha: getRobustProp(row, 'fecha'),
            items: [],
            total: 0
          };
        }
        acc[id].items.push(row);
        acc[id].total += parseFloat(getRobustProp(row, 'precio') || 0) * (getRobustProp(row, 'cantidad') || 1);
      }
      return acc;
    }, {});

    return Object.values(sessionsMap);
  } catch (error) {
    console.error('Error fetching waiter sessions:', error);
    return [];
  }
};

/**
 * Fetch user profile and role by email from USUARIOS sheet
 * @param {string} email - The user's email
 */
export const fetchUserRoleByEmail = async (email) => {
  try {
    const url = `${CONFIG.GAS_API_URL}?sheet=usuarios&EmailUser=${encodeURIComponent(email)}`;
    const response = await fetch(url);
    const result = await response.json();
    
    const rows = resolveSheetData(result, 'usuarios');
    if (rows.length > 0) {
      const user = rows[0];
      return {
        id: getRobustProp(user, 'id'),
        nombre: getRobustProp(user, 'nombre'),
        role: getRobustProp(user, 'role') || getRobustProp(user, 'usertype'),
        activo: String(getRobustProp(user, 'activo')).toUpperCase() === 'TRUE'
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
};

/**
 * Fetch all users from the USUARIOS sheet
 */
export const fetchAllUsers = async () => {
  try {
    const url = `${CONFIG.GAS_API_URL}?sheet=usuarios`;
    const response = await fetch(url);
    const result = await response.json();
    const rows = getRobustProp(result, 'usuarios') || getRobustProp(result, 'data') || [];
    
    return rows
      .filter(u => getRobustProp(u, 'EmailUser') || getRobustProp(u, 'ID_User'))
      .map(user => ({
        id: getRobustProp(user, 'ID_User') || `temp_${Math.random()}`,
        username: getRobustProp(user, 'NombreUser') || 'Sin Nombre',
        email: getRobustProp(user, 'EmailUser') || '',
        role: getRobustProp(user, 'UserType') || 'Cliente',
        active: String(getRobustProp(user, 'activo?')).toUpperCase() === 'TRUE'
      }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
};

/**
 * Save or update a user in the USUARIOS sheet
 */
export const saveUser = async (userData) => {
  try {
    const payload = {
      action: "updateDelivery", // Usamos el handler genérico del GAS
      sheet: "usuarios",
      data: {
        'ID_User': userData.id,
        'NombreUser': userData.username,
        'EmailUser': userData.email,
        'UserType': userData.role,
        'activo?': userData.active ? 'TRUE' : 'FALSE'
      }
    };

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    return await response.json();
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
};

/**
 * Save order to the COCINA sheet using a minimal payload for stability
 * @param {Object} orderData - The order payload
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
        'Notas': orderData.notas || '',
        'Pagado?': 'NO'
      }
    };

    const url = `${CONFIG.GAS_API_URL}?sheet=pedidos`;
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error saving order:', error);
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