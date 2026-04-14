import { CONFIG } from '../constants/Config';

// Caché temporal para evitar race-conditions en el monitor de cocina
const pendingUpdates = {};
const UPDATE_LOCK_MS = 10000; // 10 segundos de bloqueo post-update

/**
 * Diccionario de Estados para sincronización con Excel (Español)
 */
const STATUS_MAP = {
  toExcel: (status) => {
    const map = {
      'pending': 'Pendiente',
      'preparing': 'Preparando',
      'ready': 'Listo',
      'on_the_way': 'En Camino',
      'delivered': 'Entregado'
    };
    return map[status?.toLowerCase()] || 'Pendiente';
  },
  fromExcel: (excelStatus) => {
    const map = {
      'pendiente': 'pending',
      'nuevo': 'pending',
      'recibido': 'pending',
      'preparando': 'preparing',
      'cocinando': 'preparing',
      'listo': 'ready',
      'en camino': 'on_the_way',
      'entregado': 'delivered',
      'completado': 'ready'
    };
    return map[excelStatus?.toLowerCase()] || 'pending';
  }
};

/**
 * Utility to resolve sheet data and ensure it's in a consistent format
 */
const resolveSheetData = (data, sheetName) => {
  if (!data) return [];
  
  if (sheetName) {
    const lowerName = sheetName.toLowerCase();
    const foundKey = Object.keys(data).find(k => k.toLowerCase() === lowerName);
    if (foundKey && Array.isArray(data[foundKey])) return data[foundKey];
  }

  if ((data.status === 'success' || data.success) && data.data) return data.data;
  if (Array.isArray(data)) return data;
  
  return [];
};

/**
 * Utility to safe-get properties regardless of case
 */
const getRobustProp = (obj, propName) => {
  if (!obj) return null;
  if (obj[propName] !== undefined) return obj[propName];
  
  const lowerProp = propName.toLowerCase().replace('_', '');
  const foundKey = Object.keys(obj).find(k => {
    const normalizedKey = k.toLowerCase().replace('_', '');
    return normalizedKey === lowerProp;
  });
  return foundKey ? obj[foundKey] : null;
};

/**
 * Automatic Image Proxy
 * Mágicamente desvía las imágenes bloqueadas de Unsplash a través de un proxy CDN
 */
const getProxyImage = (url) => {
  if (!url) return null;
  // Solo aplicar proxy a imágenes de unsplash
  if (url.includes('unsplash.com')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=600&output=webp`;
  }
  return url;
};

/**
 * Map product data to UI model
 */
export const mapProductData = (item) => {
  const price = parseFloat(getRobustProp(item, 'Precio')) || 0;
  const discount = parseFloat(getRobustProp(item, 'Descuento')) || 0;
  
  return {
    id: getRobustProp(item, 'ID_Producto') || getRobustProp(item, 'ID') || Math.random().toString(),
    name: getRobustProp(item, 'Nombre') || 'Producto sin nombre',
    price: price,
    description: getRobustProp(item, 'Descripcion') || '',
    image: getProxyImage(getRobustProp(item, 'Imagen')),
    category: getRobustProp(item, 'Categoria') || 'General',
    subcategory: getRobustProp(item, 'Subcategoria') || '',
    rating: parseFloat(getRobustProp(item, 'Rating')) || 5,
    isAvailable: String(getRobustProp(item, 'Agotado')).toLowerCase() !== 'true',
    isOffer: String(getRobustProp(item, 'En_Oferta')).toLowerCase() === 'true',
    discount: discount,
    discountPrice: discount > 0 ? price * (1 - discount / 100) : price,
    isPopular: String(getRobustProp(item, 'Mas_Vendidos')).toLowerCase() === 'true',
    isHouseSpecial: String(getRobustProp(item, 'De_La_Casa')).toLowerCase() === 'true'
  };
};

/**
 * Fetch products from Google Sheets
 */
export const fetchProducts = async () => {
  try {
    const url = `${CONFIG.GAS_API_URL}`;
    const response = await fetch(url, { redirect: 'follow' });
    const data = await response.json();
    const products = resolveSheetData(data, 'Producto');
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

/**
 * Fetch business information
 */
export const fetchBusinessInfo = async () => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=inicio`, { redirect: 'follow' });
    const data = await response.json();
    const info = resolveSheetData(data, 'inicio');
    return info.length > 0 ? info[0] : { name: 'DSicario' };
  } catch (error) {
    console.error('Error fetching business info:', error);
    return { name: 'DSicario' };
  }
};

/**
 * Fetch all active orders for the Kitchen Display System (KDS)
 */
export const fetchKitchenOrders = async () => {
  try {
    const [ordersRes, itemsRes] = await Promise.all([
      fetch(`${CONFIG.GAS_API_URL}?sheet=pedidos`, { redirect: 'follow' }),
      fetch(`${CONFIG.GAS_API_URL}?sheet=pedido detalle`, { redirect: 'follow' })
    ]);

    const [ordersData, itemsData] = await Promise.all([
      ordersRes.json(),
      itemsRes.json()
    ]);

    const rawOrders = resolveSheetData(ordersData, 'pedidos');
    const rawItems = resolveSheetData(itemsData, 'pedido detalle');

    const itemsMap = {};
    rawItems.forEach(item => {
      const pid = getRobustProp(item, 'ID_Pedido');
      if (pid) {
        if (!itemsMap[pid]) itemsMap[pid] = [];
        itemsMap[pid].push(item);
      }
    });

    return rawOrders
      .filter(order => {
        const excelStatus = getRobustProp(order, 'Estado') || getRobustProp(order, 'estado pedido') || '';
        const status = STATUS_MAP.fromExcel(excelStatus);
        
        const orderDate = getRobustProp(order, 'Fecha') || '';
        const todayStr = new Date().toLocaleDateString();
        const isCompleted = ['ready', 'delivered', 'entregado', 'on_the_way'].includes(status);
        
        // Mostrar todas las activas. Para el historial, solo mostrar las procesadas hoy.
        // Si no tiene fecha, permitir pero con precaución.
        if (isCompleted && orderDate && orderDate !== todayStr) {
            return false;
        }

        return true;
      })
      .map(order => {
        const orderId = getRobustProp(order, 'ID_Pedido');
        const orderItems = itemsMap[orderId] || [];
        
        let itemsDetectados = [];
        
        // Prioridad 1: Buscar arreglo JSON en la celda 'Pedido_Items' (Hoja detalle)
        if (orderItems.length > 0) {
          const rawItemsCell = getRobustProp(orderItems[0], 'Pedido_Items');
          if (rawItemsCell && typeof rawItemsCell === 'string' && rawItemsCell.trim().startsWith('[')) {
            try { itemsDetectados = JSON.parse(rawItemsCell); } catch (e) {}
          }
        }

        // Prioridad 2: Buscar arreglo JSON en la celda 'Pedido_Items' (Hoja pedidos)
        if (itemsDetectados.length === 0) {
          const rawItemsOrder = getRobustProp(order, 'Pedido_Items');
          if (rawItemsOrder && typeof rawItemsOrder === 'string' && rawItemsOrder.trim().startsWith('[')) {
            try { itemsDetectados = JSON.parse(rawItemsOrder); } catch (e) {}
          }
        }

        const excelStatus = getRobustProp(order, 'Estado') || getRobustProp(order, 'estado pedido') || 'Pendiente';
        let finalStatus = STATUS_MAP.fromExcel(excelStatus);

        // Bloqueo de Race Condition
        const lockKey = String(orderId);
        if (pendingUpdates[lockKey]) {
            const update = pendingUpdates[lockKey];
            if (Date.now() - update.time < UPDATE_LOCK_MS) {
                finalStatus = update.status;
            } else {
                delete pendingUpdates[lockKey];
            }
        }

        return {
          id: orderId || Math.random().toString(),
          cliente: (getRobustProp(order, 'Cliente') || 'Invitado').replace('\n', '').trim(),
          items: itemsDetectados.length > 0 ? itemsDetectados.map(it => ({
            nombre: it.nombre || it.name || it.product || 'Producto',
            cantidad: it.cantidad || it.quantity || 1,
            notas: it.notas || it.notes || ''
          })) : orderItems.map(i => ({
            nombre: getRobustProp(i, 'Pedido_Items') || 'Producto',
            cantidad: 1
          })), 
          estado: finalStatus,
          hora: getRobustProp(order, 'Entrada') || '',
          total: parseFloat(getRobustProp(order, 'Total')) || 0,
        };
      });
  } catch (error) {
    console.error('Error in fetchKitchenOrders:', error);
    return [];
  }
};

/**
 * Update order status inside Google Sheets
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const idStr = String(orderId);
    const excelStatus = STATUS_MAP.toExcel(newStatus);
    
    pendingUpdates[idStr] = {
        status: newStatus,
        time: Date.now()
    };
    
    const payload = {
      action: "UPDATE",
      sheet: "pedidos",
      data: {
        'ID_Pedido': idStr,
        'Estado': excelStatus
      }
    };

    if (newStatus === 'ready') {
      payload.data['Salida'] = new Date().toLocaleTimeString();
    }
    
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    }).then(r => r.json());

    // También actualizar detalle para consistencia
    fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "UPDATE",
        sheet: "pedido detalle",
        data: { 'ID_Pedido': idStr, 'Estado': excelStatus }
      }),
      redirect: 'follow'
    }).catch(() => {});

    return response;
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
};

/**
 * Fetch rider orders
 */
export const fetchRiderOrders = async (riderId) => {
  try {
    const [deliveriesRes, itemsRes] = await Promise.all([
      fetch(`${CONFIG.GAS_API_URL}?sheet=Deliverys`, { redirect: 'follow' }),
      fetch(`${CONFIG.GAS_API_URL}?sheet=pedido detalle`, { redirect: 'follow' })
    ]);

    const deliveriesData = await deliveriesRes.json();
    const itemsData = await itemsRes.json();

    const rawDeliveries = resolveSheetData(deliveriesData, 'Deliverys');
    const rawItems = resolveSheetData(itemsData, 'pedido detalle');

    const itemsMap = {};
    rawItems.forEach(item => {
      const pid = getRobustProp(item, 'ID_Pedido');
      if (pid) {
        if (!itemsMap[pid]) itemsMap[pid] = [];
        
        let subItems = [];
        const rawItemsCell = getRobustProp(item, 'Pedido_Items');
        if (rawItemsCell && typeof rawItemsCell === 'string' && rawItemsCell.trim().startsWith('[')) {
          try { subItems = JSON.parse(rawItemsCell); } catch (e) {}
        }

        if (subItems.length > 0) {
          itemsMap[pid] = [...(itemsMap[pid] || []), ...subItems];
        } else {
          itemsMap[pid].push({
            nombre: getRobustProp(item, 'Pedido_Items') || 'Producto',
            cantidad: 1
          });
        }
      }
    });
    
    return rawDeliveries
      .filter(d => getRobustProp(d, 'ID_Rider') === riderId)
      .map(d => {
        const orderId = getRobustProp(d, 'ID_Pedido');
        const excelStatus = getRobustProp(d, 'Estado') || 'Listo';
        return {
          id: orderId,
          cliente: getRobustProp(d, 'Cliente') || 'Desconocido',
          total: parseFloat(getRobustProp(d, 'Total')) || 0,
          whatsapp: getRobustProp(d, 'Telefono') || '',
          estado: STATUS_MAP.fromExcel(excelStatus),
          items: itemsMap[orderId] || [],
        };
      });
  } catch (error) {
    console.error('Error fetching rider orders:', error);
    return [];
  }
};

/**
 * Fetch rider stats
 */
export const fetchRiderStats = async (riderId) => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=usuarios`, { redirect: 'follow' });
    const rawData = await response.json();
    const users = resolveSheetData(rawData, 'usuarios');
    const rider = users.find(u => getRobustProp(u, 'Usuario') === riderId || getRobustProp(u, 'ID_Usuario') === riderId);
    
    if (rider) {
      return {
        nombre: getRobustProp(rider, 'Nombre') || riderId,
        cartera: parseFloat(getRobustProp(rider, 'Cartera')) || 0,
        deuda: parseFloat(getRobustProp(rider, 'Deuda')) || 0,
        cupo: (parseFloat(getRobustProp(rider, 'Limite')) || 5000) - (parseFloat(getRobustProp(rider, 'Deuda')) || 0)
      };
    }
    return { cartera: 0, deuda: 0, cupo: 0, nombre: riderId };
  } catch (error) {
    return { cartera: 0, deuda: 0, cupo: 0, nombre: riderId };
  }
};

/**
 * Fetch all users
 */
export const fetchAllUsers = async () => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=usuarios`, { redirect: 'follow' });
    const data = await response.json();
    return resolveSheetData(data, 'usuarios');
  } catch (error) {
    return [];
  }
};

/**
 * Formatter and Helpers
 */
export const formatPrice = (price) => {
  if (price === undefined || price === null) return '$0.00';
  return `$${parseFloat(price).toFixed(2)}`;
};

export const fetchUserRoleByEmail = async (email) => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=usuarios&email=${email}`, { redirect: 'follow' });
    const data = await response.json();
    const users = resolveSheetData(data, 'usuarios');
    const user = users.find(u => getRobustProp(u, 'EmailUser') === email);
    return getRobustProp(user, 'UserType') || 'client';
  } catch (error) {
    return 'client';
  }
};

/**
 * DB Writers
 */
export const saveOrderDetail = async (detailData) => {
  try {
    const payload = {
      action: "ADD",
      sheet: "pedido detalle",
      data: {
        'ID_Pedido': detailData.orderId,
        'Pedido_Items': detailData.nombre,
        'ID_Producto': detailData.productId || '',
        'Estado': 'Pendiente',
        'Cantidad': detailData.cantidad || 1
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    return { success: false };
  }
};

export const saveOrder = async (orderData) => {
  try {
    const itemsJson = JSON.stringify(orderData.items.map(it => ({
      nombre: it.nombre,
      cantidad: it.cantidad,
      precio: it.precio,
      notas: it.notas || ''
    })));

    const payload = {
      action: "ADD",
      sheet: "pedidos",
      data: {
        'ID_Pedido': orderData.orderId,
        'Cliente': orderData.cliente || 'Invitado',
        'Total': orderData.total,
        'Entrada': orderData.hora || new Date().toLocaleTimeString(),
        'Fecha': new Date().toLocaleDateString(),
        'Estado': 'Pendiente',
        'Pagado?': 'NO',
        'Pedido_Items': itemsJson
      }
    };

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const headerResult = await response.json();

    if (headerResult.success || headerResult.status === 'success') {
      const detailPromises = orderData.items.map(item => 
        saveOrderDetail({ orderId: orderData.orderId, ...item })
      );
      Promise.all(detailPromises).catch(err => console.error('❌ Error saving details:', err));
    }

    return headerResult;
  } catch (error) {
    throw error;
  }
};

export const saveUser = async (userData) => {
  try {
    const payload = {
      action: "ADD",
      sheet: "usuarios",
      data: {
        'ID_Usuario': userData.id || Math.random().toString(),
        'Nombre': userData.username || userData.email?.split('@')[0] || 'Cliente',
        'Usuario': userData.email,
        'EmailUser': userData.email,
        'UserType': userData.role || 'Cliente',
        'Estado': userData.active ? 'Activo' : 'Inactivo'
      }
    };
    
    // Attempt to save to GAS
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving user to sheets:', error);
    // Resolve without throwing to not break auth flow
    return { success: false, error: error.message };
  }
};

/**
 * Submit a public product review to the 'Valoraciones' sheet in Google Sheets
 * @param {Object} reviewData - { productId, productName, rating, comment, userName, userEmail }
 */
export const submitReview = async (reviewData) => {
  const payload = {
    action: 'INSERT',
    sheet: 'Valoraciones',
    data: {
      ID_Producto: String(reviewData.productId),
      Producto:    reviewData.productName,
      Calificacion: reviewData.rating,
      Comentario:  reviewData.comment,
      Usuario:     reviewData.userName || 'Anónimo',
      Email:       reviewData.userEmail || '',
      Fecha:       new Date().toLocaleDateString('es-DO'),
    }
  };

  const response = await fetch(CONFIG.GAS_API_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    redirect: 'follow'
  });
  return response.json();
};

/**
 * Fetch all public reviews for a given product ID from the 'Valoraciones' sheet.
 * Uses the dedicated ?action=getReviews&id= endpoint for performance.
 * Falls back to full-load + client-side filter if the endpoint fails.
 * @param {string} productId
 * @returns {Array} Array of review objects
 */
export const fetchReviews = async (productId) => {
  try {
    // Usar el endpoint dedicado del GAS (más eficiente)
    const response = await fetch(
      `${CONFIG.GAS_API_URL}?action=getReviews&id=${encodeURIComponent(productId)}`,
      { redirect: 'follow' }
    );
    const data = await response.json();

    // El GAS devuelve { success: true, reviews: [...] }
    if (data && Array.isArray(data.reviews)) {
      return data.reviews;
    }

    // Fallback: leer hoja completa y filtrar en cliente
    const all = resolveSheetData(data, 'Valoraciones');
    return all.filter(r => String(getRobustProp(r, 'ID_Producto')) === String(productId));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
};

export default {
  fetchProducts,
  mapProductData,
  fetchKitchenOrders,
  updateOrderStatus,
  fetchRiderOrders,
  fetchRiderStats,
  fetchAllUsers,
  formatPrice,
  fetchUserRoleByEmail,
  saveOrder,
  saveUser,
  submitReview,
  fetchReviews
};