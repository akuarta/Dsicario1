import { CONFIG } from '../constants/Config';
import { storage } from '../config/firebaseConfig';
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
// Caché temporal para evitar race-conditions en el monitor de cocina
const pendingUpdates = {};
const UPDATE_LOCK_MS = 10000; // 10 segundos de bloqueo post-update
let cachedDeliverySheet = 'Deliverys';

// --- NUEVO: Caché en memoria para evitar saturar la cuota de Google Sheets ---
const apiCache = {
  users: { data: [], timestamp: 0 },
  kitchenOrders: { data: [], timestamp: 0 },
  deliveries: { data: [], timestamp: 0 },
  tables: { data: [], timestamp: 0 },
  business: { data: null, timestamp: 0 }
};
const API_TTL_MS = 45000; // 45 segundos de vida de caché


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
      'delivered': 'Entregado',
      'draft': 'borrador',
      'accepted': 'Aceptado',
      'proposal': 'Propuesta',
      'cancelled': 'Cancelado',
      'completed': 'Cobrado'
    };
    return map[status?.toLowerCase()] || status || 'Pendiente';
  },
  fromExcel: (excelStatus) => {
    const map = {
      // Español → inglés
      'pendiente': 'pending',
      'nuevo': 'pending',
      'recibido': 'pending',
      'preparando': 'preparing',
      'cocinando': 'preparing',
      'listo': 'ready',
      'en camino': 'on_the_way',
      'transito': 'on_the_way',
      'ruta': 'on_the_way',
      'entregado': 'delivered',
      'finalizado': 'delivered',
      'completado': 'completed',
      'cobrado': 'completed',
      'cancelado': 'cancelled',
      'rechazado': 'cancelled',
      'propuesta': 'proposal',
      'aceptado': 'accepted',
      'borrador': 'draft',
      'pre-orden': 'pre-orden',
      // ✅ Pass-through: valores ya normalizados en inglés
      'pending': 'pending',
      'preparing': 'preparing',
      'ready': 'ready',
      'on_the_way': 'on_the_way',
      'delivered': 'delivered',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'proposal': 'proposal',
      'accepted': 'accepted',
      'draft': 'draft',
    };
    return map[excelStatus?.toLowerCase()?.trim()] || 'pending';
  }
};

// ==========================================
// OFFLINE QUEUE
// ==========================================

const OFFLINE_QUEUE_KEY = '@dsicario_offline_actions';

export const queueOfflineAction = async (payload) => {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({
      ...payload,
      _timestamp: Date.now()
    });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('✅ Acción guardada en cola offline', payload.action);
  } catch (error) {
    console.error('Error guardando acción offline:', error);
  }
};

export const syncOfflineActions = async () => {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;
    
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueJson) return;
    
    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;
    
    console.log(`⏳ Sincronizando ${queue.length} acciones offline...`);
    const remainingQueue = [];
    
    for (const action of queue) {
      try {
        const payload = { ...action };
        delete payload._timestamp; // Remove local meta
        
        const response = await fetch(CONFIG.GAS_API_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
          redirect: 'follow'
        });
        
        if (!response.ok) {
           remainingQueue.push(action);
        } else {
           console.log('✅ Acción offline sincronizada con éxito:', action.action);
        }
      } catch (err) {
        remainingQueue.push(action);
      }
    }
    
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch (error) {
    console.error('Error sincronizando cola offline:', error);
  }
};

/**
 * Common order data mapper to ensure consistency across all screens
 */
export const mapOrderData = (order, itemsMap = {}) => {
  const orderId = getRobustProp(order, 'ID_Pedido') || getRobustProp(order, 'ID_Orden') || Math.random().toString();
  const excelStatus = (getRobustProp(order, 'Estado') || getRobustProp(order, 'estado') || 'Pendiente').toLowerCase();
  
  // Detección de Items (JSON o de la hoja 'pedido detalle')
  let items = itemsMap[orderId] || [];
  
  if (items.length === 0) {
    const rawItemsOrder = getRobustProp(order, 'Pedido_Items') || getRobustProp(order, 'productos') || '';
    if (rawItemsOrder && typeof rawItemsOrder === 'string' && rawItemsOrder.trim().startsWith('[')) {
      try { items = JSON.parse(rawItemsOrder); } catch (e) {}
    }
  }

  // Normalizar items
  const normalizedItems = items.map(it => ({
    nombre: it.nombre || it.name || it.product || it['Pedido_Items'] || 'Producto',
    cantidad: parseFloat(it.cantidad || it.quantity || it['Cantidad']) || 1,
    notas: it.notas || it.notes || '',
    precio: parseFloat(it.precio || it.price) || 0
  }));

  const riderIdFromOrder = String(getRobustProp(order, 'Delivery') || getRobustProp(order, 'ID_Rider') || getRobustProp(order, 'ID_Delivery') || getRobustProp(order, 'id_repartidor') || '').trim();

  const normalizedStatus = STATUS_MAP.fromExcel(excelStatus);

  return {
    id: orderId,
    id_orden: getRobustProp(order, 'ID_Orden') || orderId,
    // Nombre del cliente — ambos campos que usan Cocina y Central
    cliente: getRobustProp(order, 'Cliente') || getRobustProp(order, 'NombreUser') || 'Desconocido',
    NombreUser: getRobustProp(order, 'Cliente') || getRobustProp(order, 'NombreUser') || 'Desconocido',
    email: String(getRobustProp(order, 'Email') || getRobustProp(order, 'Usuario') || '').toLowerCase().trim(),
    id_user: getRobustProp(order, 'ID_Usuario') || getRobustProp(order, 'id_user') || '',
    total: parseFloat(getRobustProp(order, 'Total')) || 0,
    Total: parseFloat(getRobustProp(order, 'Total')) || 0,
    // ✅ UNIFICADO: Estado y estado usan el mismo valor normalizado en inglés
    // Esto resuelve el desacuerdo entre KitchenScreen (usa o.estado) y
    // OrderCenterScreen (usa o.Estado || o.status)
    estado: normalizedStatus,
    Estado: normalizedStatus,
    status: normalizedStatus,
    estado_original: excelStatus,
    fecha: getRobustProp(order, 'Fecha') || '',
    Fecha: getRobustProp(order, 'Fecha') || '',
    hora: getRobustProp(order, 'Entrada') || getRobustProp(order, 'Hora') || '',
    tipo: (() => {
      const isDelivBool = getRobustProp(order, 'Delivery?');
      const t = getRobustProp(order, 'Tipo');
      if (isDelivBool === true || String(isDelivBool).toUpperCase() === 'TRUE') return 'delivery';
      if (t === true || String(t).toUpperCase() === 'TRUE') return 'delivery';
      if (t === false || String(t).toUpperCase() === 'FALSE') return 'local';
      return String(t || 'delivery').toLowerCase();
    })(),
    Tipo: (() => {
      const isDelivBool = getRobustProp(order, 'Delivery?');
      const t = getRobustProp(order, 'Tipo');
      if (isDelivBool === true || String(isDelivBool).toUpperCase() === 'TRUE') return 'Delivery';
      if (t === true || String(t).toUpperCase() === 'TRUE') return 'Delivery';
      if (t === false || String(t).toUpperCase() === 'FALSE') return 'Local';
      return String(t || 'Delivery');
    })(),
    direccion: getRobustProp(order, 'Direccion') || getRobustProp(order, 'Ubicacion') || '',
    Direccion: getRobustProp(order, 'Direccion') || getRobustProp(order, 'Ubicacion') || '',
    whatsapp: getRobustProp(order, 'whatsapp') || getRobustProp(order, 'Telefono') || '',
    items: normalizedItems,
    riderId: riderIdFromOrder,
    id_repartidor: riderIdFromOrder,
    // Compatibilidad legacy
    ID_Pedido: orderId,
    Cliente: getRobustProp(order, 'Cliente') || getRobustProp(order, 'NombreUser') || 'Desconocido',
    TipoPago: getRobustProp(order, 'Metodo') || getRobustProp(order, 'metodo') || '',
  };
};

/**
 * Utility to resolve sheet data and ensure it's in a consistent format
 */
const resolveSheetData = (data, sheetName) => {
  if (!data) return [];
  
  // Caso 1: La data viene directamente en la clave con el nombre de la hoja
  if (sheetName && data[sheetName]) return data[sheetName];
  
  // Caso 2: La data viene dentro de un wrapper llamado "data" (como en tu script)
  if (data.data && Array.isArray(data.data)) return data.data;
  
  // Caso 3: La data ya es un array
  if (Array.isArray(data)) return data;
  
  // Caso 4: Búsqueda flexible por nombre de hoja
  if (sheetName) {
    const sn = sheetName.toLowerCase().trim();
    const foundKey = Object.keys(data).find(k => {
      const name = k.toLowerCase().trim();
      return name === sn || (name + 's') === sn || name === (sn + 's');
    });
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
  
  // Normalización: minúsculas, quitar espacios y símbolos EXCEPTO ?
  const normalize = (s) => s.toLowerCase().replace(/[_\s\(\)\/]/g, '').replace(/s$/, '');
  
  const target = normalize(propName);
  const foundKey = Object.keys(obj).find(k => normalize(k) === target);
  
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
 * Generador centralizado de IDs con acrónimo
 */
export const generateOrderId = (prefix = 'W') => {
  return `${prefix}-${Date.now()}`;
};

/**
 * Map product data to UI model
 */
export const mapProductData = (item) => {
  const price = parseFloat(getRobustProp(item, 'Precio')) || 0;
  const discount = parseFloat(getRobustProp(item, 'Descuento')) || 0;
  
  return {
    ...item,
    id: getRobustProp(item, 'ID_Producto') || getRobustProp(item, 'ID') || Math.random().toString(),
    nombre: getRobustProp(item, 'Nombre') || 'Producto sin nombre',
    precio: price,
    descripcion: getRobustProp(item, 'Descripcion') || '',
    imagen: getProxyImage(getRobustProp(item, 'Imagen')),
    categoria: getRobustProp(item, 'Categoria') || 'General',
    subcategoria: getRobustProp(item, 'Subcategoria') || '',
    rating: parseFloat(getRobustProp(item, 'Rating')) || 5,
    agotado: ['true', 'si', 'sí', '1', 'yes'].includes(String(getRobustProp(item, 'Agotado') || getRobustProp(item, 'agotado') || '').toLowerCase().trim()),
    isAvailable: !['true', 'si', 'sí', '1', 'yes'].includes(String(getRobustProp(item, 'Agotado') || getRobustProp(item, 'agotado') || '').toLowerCase().trim()),
    enOferta: ['true', 'si', 'sí', '1', 'yes'].includes(String(getRobustProp(item, 'enOferta') || getRobustProp(item, 'En_Oferta') || '').toLowerCase().trim()),
    descuento: discount,
    discountPrice: discount > 0 ? price * (1 - discount / 100) : price,
    masVendido: ['true', 'si', 'sí', '1', 'yes'].includes(String(getRobustProp(item, 'masVendido') || getRobustProp(item, 'Mas_Vendidos') || '').toLowerCase().trim()),
    delaCasa: ['true', 'si', 'sí', '1', 'yes'].includes(String(getRobustProp(item, 'delaCasa') || getRobustProp(item, 'De_La_Casa') || '').toLowerCase().trim()),
    isPreOrder: ['true', 'si', 'sí', '1', 'yes'].includes(String(getRobustProp(item, 'pre_orden?') || getRobustProp(item, 'tipo_orden') || getRobustProp(item, 'isPreOrder') || '').toLowerCase().trim()),
    recomendado: ['true', 'si', 'sí', '1', 'yes'].includes(String(getRobustProp(item, 'recomendado') || getRobustProp(item, 'Recomendado') || '').toLowerCase().trim()),
    isSuggestion: false
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
    
    // Obtener productos normales
    const normalProducts = resolveSheetData(data, 'productos') || [];
    const mappedNormal = normalProducts.map(mapProductData);
    
    // Obtener sugerencias
    const suggestedProducts = resolveSheetData(data, 'productos sugeridos') || [];
    const mappedSuggested = suggestedProducts.map(mapSuggestedProductData);
    
    // Combinar ambos
    return [...mappedNormal, ...mappedSuggested];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

/**
 * Fetch suggested products from its specific sheet
 */
export const fetchSuggestedProducts = async () => {
  try {
    const url = `${CONFIG.GAS_API_URL}`;
    const response = await fetch(url, { redirect: 'follow' });
    const data = await response.json();
    const suggested = resolveSheetData(data, 'productos sugeridos');
    return suggested || [];
  } catch (error) {
    console.error('Error fetching suggested products:', error);
    return [];
  }
};

/**
 * Map suggested product data to UI model
 */
export const mapSuggestedProductData = (item) => {
  return {
    id: getRobustProp(item, 'ID_Sugerido') || Math.random().toString(),
    nombre: getRobustProp(item, 'Nombre') || 'Sugerencia sin nombre',
    precio: parseFloat(getRobustProp(item, 'Precio_sugerido')) || 0,
    descripcion: getRobustProp(item, 'Descripcion') || '',
    imagen: getRobustProp(item, 'Imagen'),
    categoria: getRobustProp(item, 'Categoria') || 'Sugerencia',
    subcategoria: getRobustProp(item, 'Subcategoria') || '',
    suggestedBy: getRobustProp(item, 'Sugerido_por') || 'Anónimo',
    likes: parseInt(getRobustProp(item, 'like')) || 0,
    dislikes: parseInt(getRobustProp(item, 'dislike')) || 0,
    isSuggestion: true,
    isPreOrder: false,
    isAvailable: true 
  };
};

/**
 * Vote for a suggested product
 */
export const voteSuggestion = async (id, type, currentCount) => {
  try {
    const payload = {
      action: 'UPSERT',
      sheet: 'productos sugeridos',
      idField: 'ID_Sugerido',
      data: {
        'ID_Sugerido': id,
        [type === 'like' ? 'like' : 'dislike']: currentCount + 1
      }
    };
    
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error voting:', error);
    return { success: false };
  }
};

/**
 * Fetch business information
 */
export const fetchBusinessInfo = async () => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}`, { redirect: 'follow' });
    const data = await response.json();
    
    // Intentar 'Principal' primero, luego 'inicio' (compatibilidad)
    const info = resolveSheetData(data, 'Principal').length > 0 
      ? resolveSheetData(data, 'Principal') 
      : resolveSheetData(data, 'inicio');

    // Nuevas hojas específicas para pagos
    const mP = resolveSheetData(data, 'Metodos_pagos').length > 0 ? resolveSheetData(data, 'Metodos_pagos') : (resolveSheetData(data, 'Metodo_pago') || []);
    const tD = resolveSheetData(data, 'Transferencias_detalles') || [];
    
    if (info.length > 0) {
      // Tomamos la ÚLTIMA fila válida para asegurar que se lee la configuración más reciente
      const validRows = info.filter(row => 
        getRobustProp(row, 'NombreLocal') || 
        getRobustProp(row, 'nombrelocal')
      );
      const b = validRows.length > 0 ? validRows[validRows.length - 1] : info[0];

      return {
        ...b,
        name:    getRobustProp(b, 'NombreLocal') || 'D´Sicario',
        phone:   getRobustProp(b, 'TelefonoLocal') || '809-000-0000',
        email:   getRobustProp(b, 'EmailLocal') || 'ventas@dsicario.com',
        address: getRobustProp(b, 'DireccionLocal') || 'República Dominicana',
        logo:    getRobustProp(b, 'Logo') || null,
        appLink: getRobustProp(b, 'Link App') || null,
        closed:  ['true', 'si', 'sí', '1', 'yes', 'true'].includes(String(getRobustProp(b, 'Cerrado?') || getRobustProp(b, 'cerrado?') || '').toLowerCase().trim()) || getRobustProp(b, 'Cerrado?') === true,
        // Nuevos campos de configuración
        currencies: (getRobustProp(b, 'Monedas') || 'DOP, USD, EUR, COP, MXN').split(',').map(s => s.trim()),
        deliveryBaseFee: parseFloat(getRobustProp(b, 'CostoEnvioBase')) || 100,
        expressFee: parseFloat(getRobustProp(b, 'CostoEnvioExpress')) || 50,
        paymentMethods: mP.length > 0 
          ? mP.map(m => getRobustProp(m, 'Metodo Pago')).filter(Boolean)
          : (getRobustProp(b, 'MetodosPago') || 'Efectivo, Tarjeta').split(',').map(s => s.trim()),
        paymentMethodsDetailed: mP,
        transferDetails: tD,
        paymentNotes: (() => {
          try {
            return JSON.parse(getRobustProp(b, 'NotasMetodosPago') || '{}');
          } catch(e) {
            return {};
          }
        })(),
        generalPaymentNote: getRobustProp(b, 'NotaGeneralPago') || ''
      };
    }
    
    // Fallback completo para evitar undefined
    return {
      name: 'D´Sicario',
      phone: '809-000-0000',
      email: 'hairoman28@gmail.com',
      address: 'Calle diagonal 1ra. no. 29, Santo Tomas De Aquino',
      logo: null,
      appLink: null,
      closed: false,
      currencies: ['DOP', 'USD', 'EUR', 'COP', 'MXN'],
      deliveryBaseFee: 100,
      expressFee: 50,
      paymentMethods: ['Efectivo', 'Tarjeta'],
      paymentNotes: {},
      generalPaymentNote: ''
    };
  } catch (error) {
    console.error('Error fetching business info:', error);
    return {
      name: 'D´Sicario',
      closed: false,
      paymentMethods: ['Efectivo', 'Tarjeta']
    };
  }
};

export const saveBusinessInfo = async (info) => {
  try {
    const payload = {
      action: "UPSERT",
      sheet: "Principal",
      idField: "NombreLocal", 
      data: {
        'NombreLocal': info.name,
        'TelefonoLocal': info.phone,
        'EmailLocal': info.email,
        'DireccionLocal': info.address,
        'Cerrado?': info.closed ? 'TRUE' : 'FALSE',
        'CostoEnvioBase': info.deliveryBaseFee,
        'CostoEnvioExpress': info.expressFee,
        'Monedas': (info.currencies || []).join(', '),
        'MetodosPago': (info.paymentMethods || []).join(', '),
        'NotasMetodosPago': JSON.stringify(info.paymentNotes || {}),
        'NotaGeneralPago': info.generalPaymentNote || ''
      }
    };

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving business info:', error);
    return { success: false, error: error.message };
  }
};

export const savePaymentMethod = async (methodData) => {
  try {
    const payload = {
      action: "UPSERT",
      sheet: "Metodos_pagos",
      idField: "Metodo Pago",
      data: {
        'ID_BD': methodData.ID_BD || `DB-${Date.now()}`,
        'Metodo Pago': methodData.name || methodData['Metodo Pago'],
        'Tipo Entrega': methodData.deliveryType || methodData['Tipo Entrega'] || ''
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const saveTransferDetail = async (transferData) => {
  try {
    const payload = {
      action: "UPSERT",
      sheet: "Transferencias_detalles",
      idField: "Id_transf",
      data: {
        'Id_transf': transferData.Id_transf || `TRNF-${Date.now()}`,
        'Banco': transferData.Banco,
        'No_Cuenta': transferData.No_Cuenta,
        'Titular': transferData.Titular,
        'Disponible?': transferData['Disponible?'] || 'TRUE'
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};


/**
 * Update order status inside Google Sheets (allows extra fields like ID_Rider)
 */
export const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
  try {
    const idStr = String(orderId).split('.')[0].trim(); // Unificar ID (quitar .0 si existe)
    const excelStatus = STATUS_MAP.toExcel(newStatus);
    
    pendingUpdates[idStr] = {
        status: newStatus,
        extraData: extraData || {},
        time: Date.now()
    };

    // Auto-update caché local inmediatamente para que los demás módulos lo vean
    if (apiCache.kitchenOrders.data.length > 0) {
      apiCache.kitchenOrders.data = apiCache.kitchenOrders.data.map(order => {
        if (String(order.id).split('.')[0].trim() === idStr) {
          return { ...order, estado: newStatus, Estado: excelStatus, ...extraData };
        }
        return order;
      });
    }
    
    const payload = {
      action: "UPDATE",
      sheet: "pedidos",
      data: {
        'ID_Pedido': idStr,
        'Estado': excelStatus,
        ...extraData
      }
    };
    
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    }).then(r => r.json());

    // También actualizar detalle para consistencia en segundo plano
    fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: "UPDATE",
        sheet: "pedido detalle",
        data: { 'ID_Pedido': idStr, 'Estado': excelStatus, ...extraData }
      }),
      redirect: 'follow'
    }).catch(() => {});

    // 🚀 [AUTO-DESCUENTO] Si el pedido se marca como COMPLETADO o COBRADO, procesar inventario
    if (newStatus === 'completed' || newStatus === 'paid') {
      console.log(`🚀 [INVENTARIO] Pedido ${idStr} completado. Iniciando deducción automática...`);
      processInventoryDeduction(idStr).catch(err => 
        console.error('❌ [INVENTARIO] Fallo en deducción automática:', err)
      );
    }

    return response;
  } catch (error) {
    console.error('Error updating status:', error);
    if (error.message && (error.message.includes('Network') || error.message.includes('Failed to fetch') || error.message.includes('Network request failed'))) {
       console.warn('⚠️ No hay conexión. Guardando actualización de estado offline...');
       const idStr = String(orderId).split('.')[0].trim();
       const excelStatus = STATUS_MAP.toExcel(newStatus);
       const payload = {
         action: "UPDATE",
         sheet: "pedidos",
         data: {
           'ID_Pedido': idStr,
           'Estado': excelStatus,
           ...extraData
         }
       };
       await queueOfflineAction(payload);
       return { success: true, offline: true };
    }
    throw error;
  }
};

/**
 * Intelligent Inventory Deduction:
 * Matches order items with Recipes and subtracts from Warehouse stock
 */
export const processInventoryDeduction = async (orderId) => {
  try {
    console.log(`🔍 [INVENTARIO] Procesando deducción para pedido: ${orderId}`);
    
    const orderDetails = await fetchOrderDetails(orderId);
    if (!orderDetails || !orderDetails.productos) {
      console.warn(`⚠️ [INVENTARIO] No se encontraron detalles para el pedido ${orderId}`);
      return;
    }

    console.log(`📋 [INVENTARIO] Productos en el pedido:`, orderDetails.productos.length);
    
    const recetas = await fetchRecetas();
    const almacen = await fetchAlmacen();

    for (const prod of orderDetails.productos) {
      const productName = prod.nombre;
      const quantity = prod.cantidad || 1;
      
      console.log(`🍴 [INVENTARIO] Buscando receta para: "${productName}" (Cant: ${quantity})`);
      
      // La columna en la hoja Recetas es "Producto"
      const receta = recetas.filter(r => 
        String(getRobustProp(r, 'Producto')).toLowerCase().trim() === productName.toLowerCase().trim()
      );

      if (receta.length === 0) {
        console.warn(`⚠️ [INVENTARIO] No hay receta para "${productName}"`);
        continue;
      }

      console.log(`📖 [INVENTARIO] Receta encontrada con ${receta.length} ingredientes`);

      for (const ing of receta) {
        const ingredientName = getRobustProp(ing, 'Ingrediente');
        const amountPerUnit = parseFloat(getRobustProp(ing, 'Cantidad')) || 0;
        const totalToDeduct = amountPerUnit * quantity;

        if (totalToDeduct <= 0) continue;

        console.log(`   - Necesario: ${totalToDeduct} de "${ingredientName}"`);

        const almacenItem = almacen.find(a => 
          String(a.nombre).toLowerCase().trim() === String(ingredientName).toLowerCase().trim()
        );

        if (almacenItem) {
          console.log(`   ✅ [INVENTARIO] Descontando: ${almacenItem.stockActual} -> ${Math.max(0, almacenItem.stockActual - totalToDeduct)}`);
          
          await updateAlmacenItem(almacenItem.id, {
            'cant. en almacen': Math.max(0, almacenItem.stockActual - totalToDeduct)
          });
        } else {
          console.warn(`   ❌ [INVENTARIO] Ingrediente "${ingredientName}" no encontrado en Almacen`);
        }
      }
    }
    console.log(`✨ [INVENTARIO] Deducción completada para pedido ${orderId}`);
  } catch (error) {
    console.error('💥 [INVENTARIO] Error crítico en deducción:', error);
  }
};

/**
 * Responder a una propuesta de despacho (Aceptar/Rechazar)
 */
export const respondToOffer = async (orderId, riderId, accept = true) => {
  // Limpiar el lock local para que el polling del cliente vea el estado real
  const lockKey = String(orderId);
  delete pendingUpdates[lockKey];

  return await updateOrderStatus(orderId, accept ? 'Aceptado' : 'rechazado', {
    ID_Rider: accept ? riderId : '',
    ID_Pedido: orderId,
    Delivery: accept ? riderId : '', // Aseguramos que se guarde en la columna Delivery también
  });
};

/**
 * Lee el estado de un pedido específico directamente del Excel.
 * No usa el cache pendingUpdates — siempre devuelve el valor real del servidor.
 * Usado por el CheckoutScreen para detectar la respuesta del repartidor.
 */
export const fetchOrderStatus = async (orderId) => {
  try {
    const res = await fetch(`${CONFIG.GAS_API_URL}?sheet=pedidos`, { redirect: 'follow' });
    const data = await res.json();
    const rawOrders = resolveSheetData(data, 'pedidos');
    const order = rawOrders.find(o => {
      const id = getRobustProp(o, 'ID_Pedido');
      return String(id).trim().toLowerCase() === String(orderId).trim().toLowerCase();
    });
    if (!order) return null;
    const excelStatus = getRobustProp(order, 'Estado') || '';
    return STATUS_MAP.fromExcel(excelStatus); // 'ready' | 'rechazado' | 'propuesta' | etc.
  } catch (e) {
    console.warn('[fetchOrderStatus] Error:', e.message);
    return null;
  }
};


export const fetchKitchenOrders = async () => {
  try {
    const now = Date.now();
    if (apiCache.kitchenOrders.data.length > 0 && (now - apiCache.kitchenOrders.timestamp) < API_TTL_MS) {
      // Servir desde caché sin hacer peticiones a GAS
      return apiCache.kitchenOrders.data.map(order => {
        const lockKey = order.id ? String(order.id).split('.')[0].trim() : null;
        if (lockKey && pendingUpdates[lockKey]) {
            const update = pendingUpdates[lockKey];
            const elapsed = Date.now() - update.time;
            if (elapsed < UPDATE_LOCK_MS) {
                return { ...order, estado: update.status, Estado: STATUS_MAP.toExcel(update.status), ...update.extraData };
            } else {
                delete pendingUpdates[lockKey];
            }
        }
        return order;
      });
    }

    const [ordersRes, itemsRes] = await Promise.all([
      fetch(`${CONFIG.GAS_API_URL}?sheet=Pedidos`, { redirect: 'follow' }),
      fetch(`${CONFIG.GAS_API_URL}?sheet=pedido detalle`, { redirect: 'follow' })
    ]);

    const [ordersData, itemsData] = await Promise.all([
      ordersRes.json(),
      itemsRes.json()
    ]);

    const rawOrders = resolveSheetData(ordersData, 'Pedidos');
    const rawItems = resolveSheetData(itemsData, 'pedido detalle');

    const itemsMap = {};
    rawItems.forEach(item => {
      const pid = getRobustProp(item, 'ID_Pedido');
      if (pid) {
        if (!itemsMap[pid]) itemsMap[pid] = [];
        itemsMap[pid].push(item);
      }
    });

    const result = rawOrders
      .filter(order => {
        const excelStatus = getRobustProp(order, 'Estado') || getRobustProp(order, 'estado pedido') || '';
        const status = STATUS_MAP.fromExcel(excelStatus);
        
        const orderDate = getRobustProp(order, 'Fecha') || '';
        const todayStr = new Date().toLocaleDateString();
        // ⚠️ 'on_the_way' must NOT be here — in-transit orders are still ACTIVE
        const isCompleted = ['delivered', 'entregado', 'completed'].includes(status);
        
        // Mostrar todas las activas. Para el historial, solo mostrar las procesadas hoy.
        // Si no tiene fecha, permitir pero con precaución.
        if (isCompleted && orderDate && orderDate !== todayStr) {
            return false;
        }

        return true;
      })
      .map(order => {
        const mapped = mapOrderData(order, itemsMap);
        
        // Bloqueo de Race Condition (Blindaje de 10s)
        const lockKey = mapped.id ? String(mapped.id).split('.')[0].trim() : null;
        if (lockKey && pendingUpdates[lockKey]) {
            const update = pendingUpdates[lockKey];
            const elapsed = Date.now() - update.time;
            if (elapsed < UPDATE_LOCK_MS) {
                // Forzar el estado local mientras el lock esté activo
                mapped.estado = update.status;
                mapped.Estado = STATUS_MAP.toExcel(update.status);
            } else {
                delete pendingUpdates[lockKey];
            }
        }
        return mapped;
      });
      
      apiCache.kitchenOrders = { data: result, timestamp: now };
      return result;
  } catch (error) {
    console.error('Error in fetchKitchenOrders:', error);
    return apiCache.kitchenOrders.data || [];
  }
};

/**
 * Fetch ALL orders from the sheet (for History)
 */
export const fetchOrders = async () => {
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

    return rawOrders.map(order => {
      const orderId = getRobustProp(order, 'ID_Pedido');
      const orderItems = itemsMap[orderId] || [];
      
      let itemsDetectados = [];
      
      // Intentar JSON
      const rawItemsOrder = getRobustProp(order, 'Pedido_Items');
      if (rawItemsOrder && typeof rawItemsOrder === 'string' && rawItemsOrder.trim().startsWith('[')) {
        try { itemsDetectados = JSON.parse(rawItemsOrder); } catch (e) {}
      }

      if (itemsDetectados.length === 0 && orderItems.length > 0) {
        const rawItemsCell = getRobustProp(orderItems[0], 'Pedido_Items');
        if (rawItemsCell && typeof rawItemsCell === 'string' && rawItemsCell.trim().startsWith('[')) {
          try { itemsDetectados = JSON.parse(rawItemsCell); } catch (e) {}
        }
      }

      return {
        id: orderId || Math.random().toString(),
        ID_Pedido: orderId,
        ID_Orden: getRobustProp(order, 'ID_Orden') || orderId,
        Cliente: getRobustProp(order, 'Cliente'),
        email: String(getRobustProp(order, 'Email') || getRobustProp(order, 'Usuario') || '').toLowerCase(),
        EmailUser: String(getRobustProp(order, 'Email') || getRobustProp(order, 'Usuario') || '').toLowerCase(),
        ID_Usuario: getRobustProp(order, 'ID_Usuario') || '',
        id_user: getRobustProp(order, 'ID_Usuario') || '',
        total: parseFloat(getRobustProp(order, 'Total')) || 0,
        Estado: getRobustProp(order, 'Estado') || 'Pendiente',
        estado: STATUS_MAP.fromExcel(getRobustProp(order, 'Estado') || 'Pendiente'),
        Fecha: getRobustProp(order, 'Fecha') || '',
        hora: getRobustProp(order, 'Entrada') || '',
        tipo: (() => {
          const t = getRobustProp(order, 'Tipo');
          if (t === true || String(t).toUpperCase() === 'TRUE') return 'Delivery';
          if (t === false || String(t).toUpperCase() === 'FALSE') return 'Local';
          return String(t || 'Delivery');
        })(),
        direccion: getRobustProp(order, 'Direccion') || '',
        items: itemsDetectados.length > 0 ? itemsDetectados : orderItems.map(i => ({
          nombre: getRobustProp(i, 'Pedido_Items') || 'Producto',
          cantidad: 1
        }))
      };
    });
  } catch (error) {
    console.error('Error fetching history orders:', error);
    return [];
  }
};


/**
 * Specialized function for Riders to pick up an order
 */
export const pickupOrder = async (orderId, riderId) => {
  return await updateOrderStatus(orderId, 'on_the_way', {
    'ID_Rider': riderId,
    'Salida': new Date().toLocaleTimeString() 
  });
};

/**
 * Fetch rider orders
 */
export const fetchRiderOrders = async (riderId) => {
  try {
    const [ordersRes, itemsRes] = await Promise.all([
      fetch(`${CONFIG.GAS_API_URL}?sheet=pedidos`, { redirect: 'follow' }),
      fetch(`${CONFIG.GAS_API_URL}?sheet=pedido detalle`, { redirect: 'follow' })
    ]);

    const ordersData = await ordersRes.json();
    const itemsData = await itemsRes.json();

    const rawOrders = resolveSheetData(ordersData, 'pedidos');
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
    
    return rawOrders
      .filter(d => {
        const orderId = getRobustProp(d, 'ID_Pedido');
        const lockKey = orderId ? String(orderId).split('.')[0].trim() : null;
        
        let dRiderId = String(getRobustProp(d, 'Delivery') || getRobustProp(d, 'ID_Rider') || getRobustProp(d, 'ID_Delivery') || getRobustProp(d, 'id_repartidor') || '').trim().toLowerCase();
        let excelStatus = (getRobustProp(d, 'Estado') || '').toLowerCase();

        // 🛡️ Aplicar candados locales para que el Rider vea cambios instantáneamente sin recargar
        if (lockKey && pendingUpdates[lockKey]) {
             const update = pendingUpdates[lockKey];
             if ((Date.now() - update.time) < UPDATE_LOCK_MS) {
                 excelStatus = STATUS_MAP.toExcel(update.status).toLowerCase();
                 if (update.extraData && update.extraData.ID_Rider) {
                     dRiderId = String(update.extraData.ID_Rider).trim().toLowerCase();
                 }
                 if (update.extraData && update.extraData.Delivery) {
                     dRiderId = String(update.extraData.Delivery).trim().toLowerCase();
                 }
             }
        }

        const rIdClean = String(riderId || '').trim().toLowerCase();

        const cleanDRiderId = dRiderId.replace(/^0+/, '').trim().toLowerCase();
        const cleanRId = rIdClean.replace(/^0+/, '').trim().toLowerCase();
        const cleanDRiderIdAlt = dRiderId.replace(/[^a-z0-9]/g, '');
        const cleanRIdAlt = rIdClean.replace(/[^a-z0-9]/g, '');

        const isMatch = (cleanDRiderId === cleanRId && cleanRId !== '') || 
                        (cleanDRiderIdAlt === cleanRIdAlt && cleanRIdAlt !== '');
        
        const normalizedExcelStatus = STATUS_MAP.fromExcel(excelStatus);
        const isReadyStatus = excelStatus === 'listo' || excelStatus === 'ready' || normalizedExcelStatus === 'ready';
        const rawDeliveryBool = getRobustProp(d, 'Delivery?');
        const rawTipo = getRobustProp(d, 'Tipo');
        const tipoEntrega = String(rawTipo || '').toLowerCase().trim();
        
        // ✅ Prioridad total al booleano 'Delivery?'
        const isDeliveryType = (rawDeliveryBool === true || String(rawDeliveryBool).toUpperCase() === 'TRUE') || 
                               ((rawDeliveryBool === null || rawDeliveryBool === undefined) && 
                                (tipoEntrega !== 'local' && tipoEntrega !== 'mesa' && tipoEntrega !== 'recogida' && tipoEntrega !== 'pickup'));


        const isAssignedToMe = isMatch && excelStatus !== 'propuesta' && excelStatus !== 'liquidado';
        const isProposalForMe = isMatch && excelStatus === 'propuesta';
        
        // siempre que no tenga a nadie asignado aún (o diga 'pendiente')
        // Solo permitimos recoger si es tipo DELIVERY
        const isAvailableToPick = (dRiderId === '' || dRiderId === 'n/a' || dRiderId === 'pendiente' || dRiderId === '0') && 
                                  isReadyStatus && isDeliveryType;

        return isAssignedToMe || isAvailableToPick || isProposalForMe;
      })
      .map(d => {
        const orderId = getRobustProp(d, 'ID_Pedido');
        let excelStatus = (getRobustProp(d, 'Estado') || 'Listo').toLowerCase();
        let finalStatus = STATUS_MAP.fromExcel(excelStatus);
        
        const lockKey = orderId ? String(orderId).split('.')[0].trim() : null;
        if (lockKey && pendingUpdates[lockKey]) {
            const update = pendingUpdates[lockKey];
            if ((Date.now() - update.time) < UPDATE_LOCK_MS) {
                finalStatus = update.status;
            } else {
                delete pendingUpdates[lockKey];
            }
        }
        
        // --- Mejorado: Detección de Items ---
        let itemsBrief = itemsMap[orderId] || [];
        
        // Fallback: Si no hay items en 'pedido detalle', buscar el JSON en la columna 'Pedido_Items' de la fila del pedido
        if (itemsBrief.length === 0) {
          const rawItemsOrder = getRobustProp(d, 'Pedido_Items');
          if (rawItemsOrder && typeof rawItemsOrder === 'string' && rawItemsOrder.trim().startsWith('[')) {
            try { itemsBrief = JSON.parse(rawItemsOrder); } catch (e) {}
          }
        }

        return {
          id: orderId,
          riderId: getRobustProp(d, 'ID_Rider') || getRobustProp(d, 'ID_Repartidor') || '',
          cliente: getRobustProp(d, 'Cliente') || 'Desconocido',
          total: parseFloat(getRobustProp(d, 'Total')) || 0,
          whatsapp: getRobustProp(d, 'whatsapp') || getRobustProp(d, 'Telefono') || '',
          direccion: getRobustProp(d, 'direccion') || getRobustProp(d, 'Direccion') || getRobustProp(d, 'Dirección') || getRobustProp(d, 'Ubicacion') || getRobustProp(d, 'Ubicación') || '',
          estado: finalStatus,
          items: itemsBrief.map(it => {
            const name = it.nombre || it.name || it.product || (it['Pedido_Items'] || 'Producto');
            const qty = it.cantidad || it.quantity || (it['Cantidad'] || 1);
            return {
              nombre: String(name),
              cantidad: parseInt(qty) || 1,
              precio: parseFloat(it.precio || 0) || 0
            };
          }),
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
export const fetchRiderStats = async (riderId, email = null) => {
  try {
    const [userRes, deliveryRes] = await Promise.all([
      fetch(`${CONFIG.GAS_API_URL}?sheet=usuarios`, { redirect: 'follow' }),
      fetchDeliveries()
    ]);
    
    const rawUsers = await userRes.json();
    const users = resolveSheetData(rawUsers, 'usuarios');
    const riderUser = users.find(u => 
      String(getRobustProp(u, 'Usuario')) === String(riderId) || 
      String(getRobustProp(u, 'ID_Usuario')) === String(riderId) ||
      String(getRobustProp(u, 'ID_User')) === String(riderId) ||
      (email && String(getRobustProp(u, 'Email')).toLowerCase() === String(email).toLowerCase()) ||
      (email && String(getRobustProp(u, 'EmailUser')).toLowerCase() === String(email).toLowerCase())
    );
    
    // Buscar datos específicos de delivery
    const deliveryInfo = deliveryRes.find(d => 
      String(d.id) === String(riderId) || 
      String(d.id_delivery) === String(riderId) ||
      String(getRobustProp(d, 'id_user')) === String(riderId) ||
      (email && String(getRobustProp(d, 'Email')).toLowerCase() === String(email).toLowerCase())
    );
    
    const resolvedName = (riderUser ? (getRobustProp(riderUser, 'NombreUser') || getRobustProp(riderUser, 'Nombre')) : null) || 
                         (deliveryInfo ? (deliveryInfo.nombre || deliveryInfo.Nombre) : null);
    
    // 🛡️ Triple-check: Si no hay nombre resuelto, intentar usar el displayName del sistema si es posible
    // pero el finalName garantiza que no sea nulo.
    
    // 🛡️ Triple-check: No devolver el ID como nombre
    const finalName = (resolvedName && resolvedName !== riderId) ? resolvedName : 'Repartidor';

    return {
      nombre: finalName,
      id_repartidor: riderId,
      cartera: deliveryInfo ? deliveryInfo.cartera : (riderUser ? parseFloat(getRobustProp(riderUser, 'Cartera')) : 0) || 0,
      deuda: deliveryInfo ? deliveryInfo.deuda_efectivo : (riderUser ? parseFloat(getRobustProp(riderUser, 'Deuda')) : 0) || 0,
      cupo: (parseFloat(getRobustProp(riderUser, 'Limite')) || 5000) - (deliveryInfo ? deliveryInfo.deuda_efectivo : 0),
      activo: deliveryInfo ? deliveryInfo.activo : false,
      disponible: deliveryInfo ? deliveryInfo.disponible : false,
      fullData: deliveryInfo || {}
    };
  } catch (error) {
    console.error('Error fetching rider stats:', error);
    return { cartera: 0, deuda: 0, cupo: 0, nombre: 'Repartidor', activo: false };
  }
};

/**
 * Fetch all users
 */
export const fetchAllUsers = async () => {
  try {
    const now = Date.now();
    if (apiCache.users.data.length > 0 && (now - apiCache.users.timestamp) < API_TTL_MS) {
      return apiCache.users.data;
    }
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=Usuarios`, { redirect: 'follow' });
    const data = await response.json();
    const result = resolveSheetData(data, 'Usuarios');
    apiCache.users = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error('Error fetching users:', error);
    return apiCache.users.data || [];
  }
};

/**
 * Helper para obtener el siguiente ID secuencial de una hoja
 */
export const getNextId = async (sheetName, prefix) => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=${sheetName}`, { redirect: 'follow' });
    const data = await response.json();
    const rows = resolveSheetData(data, sheetName);
    const count = rows.length;
    return `${prefix}${String(count + 1).padStart(2, '0')}`;
  } catch (error) {
    console.error(`Error generating next ID for ${sheetName}:`, error);
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }
};

/**
 * Formatter and Helpers
 */
export const formatPrice = (price) => {
  if (price === undefined || price === null) return 'DOP $0.00';
  return `DOP $${parseFloat(price).toFixed(2)}`;
};

export const fetchUserRoleByEmail = async (email) => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=Usuarios`, { redirect: 'follow' });
    const data = await response.json();
    const users = resolveSheetData(data, 'Usuarios');
    console.log('[DEBUG API] Buscando email:', email);
    console.log('[DEBUG API] Total usuarios en hoja:', users.length);
    if (users.length > 0) console.log('[DEBUG API] Columnas detectadas en Usuarios:', Object.keys(users[0]));

    // Contar cuántos hay de cada tipo para el orden secuencial
    const roleCounts = {};
    users.forEach(u => {
      const r = (getRobustProp(u, 'UserType') || getRobustProp(u, 'Rol') || 'Cliente').toLowerCase();
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    });

    const user = users.find(u => 
      (getRobustProp(u, 'EmailUser') || getRobustProp(u, 'Email') || getRobustProp(u, 'Correo') || '').toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!user) {
        console.warn('[DEBUG API] No se encontró el usuario en la hoja de Usuarios. Email buscado:', email);
        return { notFound: true, roleCounts: roleCounts };
    }

    return {
      id: getRobustProp(user, 'ID_User') || getRobustProp(user, 'ID_Usuario') || getRobustProp(user, 'id_user') || getRobustProp(user, 'id') || '',
      userTypeId: getRobustProp(user, 'ID_UserType') || getRobustProp(user, 'UserTypeId') || '',
      nombre: getRobustProp(user, 'NombreUser') || getRobustProp(user, 'Nombre') || '',
      rol: getRobustProp(user, 'UserType') || getRobustProp(user, 'Rol') ||'Cliente',
      direccion: getRobustProp(user, 'DireccionUser') || getRobustProp(user, 'Direccion') || '',
      telefono: getRobustProp(user, 'TelefonoUser') || getRobustProp(user, 'Telefono') || '',
      activo: getRobustProp(user, 'activo?') === 'TRUE' || getRobustProp(user, 'activo?') === true || getRobustProp(user, 'Activo?') === 'TRUE',
      online: getRobustProp(user, 'Online?') === 'TRUE' || getRobustProp(user, 'Online?') === true,
      roleCounts: roleCounts // Pasamos los conteos al contexto
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Fetch all delivery riders
 */
export const fetchDeliveries = async () => {
  try {
    const now = Date.now();
    if (apiCache.deliveries.data.length > 0 && (now - apiCache.deliveries.timestamp) < API_TTL_MS) {
      return apiCache.deliveries.data;
    }

    const sheetsToTry = ['Deliverys', 'Delivery', 'Repartidores'];
    let raw = [];
    let foundSheet = 'Deliverys';

    for (const sheetName of sheetsToTry) {
        try {
          const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=${sheetName}`, { redirect: 'follow' });
          const data = await response.json();
          raw = resolveSheetData(data, sheetName);
          if (raw && raw.length > 0) {
            foundSheet = sheetName;
            break;
          }
        } catch (e) {
          console.warn(`Error trying sheet ${sheetName}:`, e);
        }
    }
    
    cachedDeliverySheet = foundSheet;
    
    if (!raw || raw.length === 0) {
        try {
          const response = await fetch(`${CONFIG.GAS_API_URL}`, { redirect: 'follow' });
          const data = await response.json();
          const firstKey = Object.keys(data).find(k => k.toLowerCase().includes('delivery') || k.toLowerCase().includes('repartid'));
          if (firstKey) raw = data[firstKey];
        } catch (e) {
          console.error('Final fallback fetch failed:', e);
        }
    }
    
    if (!raw || !Array.isArray(raw)) return [];

    const mapped = raw.map(d => {
      const id = getRobustProp(d, 'ID_UserType') || getRobustProp(d, 'ID_Delivery') || getRobustProp(d, 'ID_Rider') || getRobustProp(d, 'ID');
      const fallbackId = getRobustProp(d, 'id') || getRobustProp(d, 'id_user') || Math.random().toString();
      const finalRiderId = id ? String(id) : String(fallbackId);
      
      const rawActivo = String(getRobustProp(d, 'Activo') || '').toLowerCase().trim();
      const rawDisponible = String(getRobustProp(d, 'Disponible') || '').toLowerCase().trim();
      const rawEstado = String(getRobustProp(d, 'Estado') || '').toLowerCase().trim();

      const isActive = rawActivo === 'true' || rawActivo === 'si' || rawActivo === 'activo' || rawActivo === '1' || rawEstado === 'activo';
      const isAvailable = rawDisponible === 'true' || rawDisponible === 'si' || rawDisponible === 'disponible' || rawDisponible === '1' || rawDisponible === ''; 

      const nombreDetectado = getRobustProp(d, 'Nombre') || getRobustProp(d, 'Rider') || getRobustProp(d, 'NombreUser') || id;
      const apellidoDetectado = getRobustProp(d, 'Apellido') || '';
      const vehiculo = getRobustProp(d, 'Vehiculo') || getRobustProp(d, 'Moto') || getRobustProp(d, 'Transporte') || 'Moto';

      return {
        id: String(finalRiderId),
        id_delivery: String(finalRiderId),
        nombre: String(nombreDetectado),
        apellido: String(apellidoDetectado),
        id_user: String(getRobustProp(d, 'id_user') || '').trim(),
        email: String(getRobustProp(d, 'EmailUser') || getRobustProp(d, 'Email') || getRobustProp(d, 'Correo') || getRobustProp(d, 'Usuario') || '').trim(),
        telefono: String(getRobustProp(d, 'Telefono') || String(getRobustProp(d, 'WhatsApp') || '')),
        whatsapp: String(getRobustProp(d, 'WhatsApp') || String(getRobustProp(d, 'Telefono') || '')),
        vehiculo: vehiculo,
        costo_pedido: parseFloat(getRobustProp(d, 'Costo_Pedido')) || 50,
        cartera: parseFloat(getRobustProp(d, 'Cartera')) || 0,
        deuda_efectivo: parseFloat(getRobustProp(d, 'Deuda_Efectivo')) || 0,
        rapidez: parseFloat(getRobustProp(d, 'Rapidez')) || 5.0,
        servicio: parseFloat(getRobustProp(d, 'Servicio')) || 5.0,
        honestidad: parseFloat(getRobustProp(d, 'Honestidad')) || 5.0,
        activo: isActive,
        disponible: isAvailable,
        foto: getRobustProp(d, 'Foto') || '',
        pushToken: getRobustProp(d, 'PushToken') || null,
        callmebotKey: getRobustProp(d, 'CallmebotKey') || null,
        ultima_conexion: getRobustProp(d, 'Ultima_Conexion') || getRobustProp(d, 'UltimaConexion') || null,
        online: null,
      };
    });

    try {
      const usuariosResp = await fetch(`${CONFIG.GAS_API_URL}?sheet=Usuarios`, { redirect: 'follow' });
      const usuariosData = await usuariosResp.json();
      const usuarios = resolveSheetData(usuariosData, 'Usuarios');

      const parseStatus = (raw) =>
        raw === null || raw === '' ? null : (String(raw).toUpperCase() === 'TRUE' || raw === true);

      const normalizeId = (id) => (id || '').toUpperCase().trim();

      const usuarioMapEmail = {};
      const usuarioMapType = {};

      usuarios.forEach(u => {
        const correo = (getRobustProp(u, 'EmailUser') || getRobustProp(u, 'Email') || '').toLowerCase().trim();
        const typeId  = normalizeId(getRobustProp(u, 'ID_UserType'));
        const rawOnline = getRobustProp(u, 'Online?') || null;
        const rawActivo = getRobustProp(u, 'activo?') || getRobustProp(u, 'Activo?') || null;
        const entry = { online: parseStatus(rawOnline), activo: parseStatus(rawActivo) };
        if (correo) usuarioMapEmail[correo] = entry;
        if (typeId)  usuarioMapType[typeId]  = entry;
      });

      mapped.forEach(r => {
        const correo = (r.email || '').toLowerCase().trim();
        const normalizedDeliveryId = normalizeId(r.id_delivery);
        const emailMatch = correo ? usuarioMapEmail[correo] : null;
        if (emailMatch) {
          r.online = emailMatch.online;
          if (emailMatch.activo !== null) r.activo = emailMatch.activo;
        } else {
          const typeMatch = usuarioMapType[normalizedDeliveryId] ?? null;
          if (typeMatch) r.online = typeMatch.online;
        }
      });
    } catch (e) {
      console.warn('[fetchDeliveries] Cross-ref error:', e);
    }

    const unique = [];
    const seenUids = new Set();
    const sortedMapped = [...mapped].sort((a, b) => (b.activo ? 1 : 0) - (a.activo ? 1 : 0));

    sortedMapped.forEach(r => {
      if (r.id_user && r.id_user.length > 20 && !seenUids.has(r.id_user)) {
        if (r.id_delivery.startsWith('DLV') || r.id_delivery.startsWith('DS')) {
          unique.push(r);
          seenUids.add(r.id_user);
        }
      }
    });

    sortedMapped.forEach(r => {
      const alreadyIn = unique.find(u => u.id_delivery === r.id_delivery || (r.id_user && u.id_user === r.id_user));
      if (!alreadyIn) {
        unique.push(r);
        if (r.id_user) seenUids.add(r.id_user);
      }
    });

    apiCache.deliveries = { data: unique, timestamp: now };
    return unique;
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return apiCache.deliveries.data || [];
  }
};

/**
 * Update rider heartbeat/connection
 */
export const pingRider = async (riderId, firebaseUid = null, name = null) => {
  try {
    const promises = [];
    
    // 📡 Actualizar hoja de Deliverys
    const payloadDelivery = {
      action: "UPSERT",
      sheet: "Deliverys",
      idField: "ID_UserType",
      data: {
        'ID_UserType': String(riderId),
        'ID_Delivery': String(riderId),
        'ID_Rider': String(riderId),
        'Ultima_Conexion': new Date().toISOString()
      }
    };
    promises.push(fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payloadDelivery),
      redirect: 'follow'
    }));

    // 👤 Actualizar hoja de Usuarios usando la función robusta (mantiene Online=TRUE)
    if (firebaseUid) {
      promises.push(setUserOnlineStatus(firebaseUid, true, null, name));
    }

    await Promise.all(promises);
    return { success: true };
  } catch (e) {
    console.error('[API] Error in pingRider:', e);
    return { success: false };
  }
};

/**
 * Mark rider as offline in both sheets
 */
export const setOffline = async (riderId, firebaseUid = null, name = null) => {
  try {
    const promises = [];
    
    // 1. Actualizar hoja Deliverys
    if (riderId && riderId !== 'N/A') {
      const payloadDelivery = {
        action: "UPSERT",
        sheet: "Deliverys",
        idField: "ID_UserType",
        data: {
          'ID_UserType': String(riderId),
          'ID_Delivery': String(riderId),
          'ID_Rider': String(riderId),
          'Online?': 'FALSE'
        }
      };
      promises.push(fetch(CONFIG.GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify(payloadDelivery),
        redirect: 'follow'
      }));
    }

    // 2. Actualizar hoja Usuarios usando la función robusta
    if (firebaseUid) {
      promises.push(setUserOnlineStatus(firebaseUid, false, null, name));
    }

    await Promise.all(promises);
    return { success: true };
  } catch (e) {
    console.error('[API] Error in setOffline:', e);
    return { success: false };
  }
};

/**
 * Fetch all items from Almacen (Raw Materials)
 */
export const fetchAlmacen = async () => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=Almacen`, { redirect: 'follow' });
    const data = await response.json();
    const raw = resolveSheetData(data, 'Almacen');
    
    return raw.filter(item => getRobustProp(item, 'IDmp') || getRobustProp(item, 'Materia prima'))
      .map(item => ({
        id: String(getRobustProp(item, 'IDmp')),
        nombre: getRobustProp(item, 'Materia prima') || 'Sin nombre',
        cantidadEmpaque: parseFloat(getRobustProp(item, 'Cant. de empaque')) || 0,
        tipoEmpaque: getRobustProp(item, 'Tipo de empaque') || '',
        unidadesPorEmpaque: parseFloat(getRobustProp(item, 'Und. x empaque')) || 1,
        cantidadUnidades: parseFloat(getRobustProp(item, 'cant. de und.')) || 0,
        stockActual: parseFloat(getRobustProp(item, 'cant. en almacen')) || 0,
        costoUnitario: parseFloat(getRobustProp(item, 'Coste unitario')) || 0,
        entradas: parseFloat(getRobustProp(item, 'cant. entrada')) || 0,
        salidas: parseFloat(getRobustProp(item, 'cant. de salida')) || 0,
        porcionesPorUnidad: parseFloat(getRobustProp(item, 'Porcion x und')) || 1,
        tipoPorcion: getRobustProp(item, 'Porcion') || 'unidad',
        tipoMedida: getRobustProp(item, 'Tipo medida') || getRobustProp(item, 'Porcion') || 'und',
        cantidadPorciones: parseFloat(getRobustProp(item, 'cant. porcion')) || 0,
        costoTotal: parseFloat(getRobustProp(item, 'Coste total')) || 0
      }));
  } catch (error) {
    console.error('Error fetching Almacen:', error);
    return [];
  }
};

/**
 * Update Almacen item stock
 */
export const updateAlmacenItem = async (itemId, updateData) => {
  try {
    const payload = {
      action: "UPSERT",
      sheet: "Almacen",
      idField: "IDmp",
      data: {
        'IDmp': String(itemId),
        ...updateData
      }
    };
    
    console.log('🌐 [API] updateAlmacenItem Sending:', payload);
    
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    
    const result = await response.json();
    console.log('🌐 [API] updateAlmacenItem Result:', result);
    return result;
  } catch (error) {
    console.error('🌐 [API] updateAlmacenItem Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch Recetas
 */
export const fetchRecetas = async () => {
  try {
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=Recetas`, { redirect: 'follow' });
    const data = await response.json();
    return resolveSheetData(data, 'Recetas');
  } catch (error) {
    console.error('Error fetching Recetas:', error);
    return [];
  }
};

/**
 * Save or Update a Recipe Ingredient
 */
export const saveRecipeIngredient = async (recipeData) => {
  try {
    const payload = {
      action: "UPSERT",
      sheet: "Recetas",
      idField: "IDrecetas",
      data: {
        'IDrecetas': recipeData.IDrecetas || String(Date.now()),
        'productos terminados': recipeData.productName,
        'ingrediente': recipeData.ingredientName,
        'cant. pocion': recipeData.quantity,
        'tipo de porcion': recipeData.unit
      }
    };
    
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving recipe ingredient:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a Recipe Ingredient
 */
export const deleteRecipeIngredient = async (idReceta) => {
  try {
    const payload = {
      action: "DELETE",
      sheet: "Recetas",
      idField: "IDrecetas",
      idValue: String(idReceta)
    };
    
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting recipe ingredient:', error);
    return { success: false, error: error.message };
  }
};

export const setUserOnlineStatus = async (firebaseUid, isOnline, email = null, name = null) => {
  // LOG INMEDIATO: Para verificar que la función se llama
  console.log(`[USER_PRESENCE] 🚀 Iniciando setUserOnlineStatus: UID=${firebaseUid}, Online=${isOnline}, Email=${email}, Name=${name}`);

  if (!firebaseUid && !email) return { success: false };
  
  try {
    const idField = (firebaseUid && firebaseUid !== 'N/A') ? "ID_User" : "EmailUser";
    const idValue = (firebaseUid && firebaseUid !== 'N/A') ? firebaseUid : email;

    const payload = {
      action: "UPSERT",
      sheet: "Usuarios",
      idField: idField,
      data: {
        [idField]: idValue,
        'Online?': isOnline ? 'TRUE' : 'FALSE'
      }
    };

    // 🛡️ REQUISITO DEL SERVIDOR: NombreUser es obligatorio para UPSERT
    if (name) {
      payload.data['NombreUser'] = name;
    }

    if (idField === "ID_User" && email) {
      payload.data['EmailUser'] = email;
    } else if (idField === "EmailUser" && firebaseUid) {
      payload.data['ID_User'] = firebaseUid;
    }

    console.log(`[USER_PRESENCE] 📤 Enviando payload (con NombreUser):`, JSON.stringify(payload));
    
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    
    const result = await response.json();
    console.log(`[USER_PRESENCE] 📡 Respuesta del servidor (Usuarios):`, JSON.stringify(result));
    
    return { success: result.success, result };
  } catch (e) {
    console.error(`[USER_PRESENCE] ❌ Error crítico en setUserOnlineStatus:`, e);
    return { success: false, error: e.message };
  }
};

/**
 * Liquidate all cash debt for a rider
 */
export const liquidateRiderCash = async (riderId) => {
  try {
    const payload = {
      action: "UPSERT",
      sheet: "Deliverys",
      idField: "ID_UserType",
      data: {
        'ID_UserType': String(riderId),
        'Deuda_Efectivo': 0,
        'UltimaLiquidacion': new Date().toISOString()
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error liquidating cash:', error);
    return { success: false };
  }
};

/**
 * Fetch all tables
 */
export const fetchTables = async () => {
  try {
    const now = Date.now();
    if (apiCache.tables.data.length > 0 && (now - apiCache.tables.timestamp) < API_TTL_MS) {
      return apiCache.tables.data;
    }
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=Mesas`, { redirect: 'follow' });
    const data = await response.json();
    const raw = resolveSheetData(data, 'Mesas');
    
    const result = raw
      .filter(m => getRobustProp(m, 'ID_Mesa') || getRobustProp(m, 'Nombre'))
      .map((m, index) => {
        const id = getRobustProp(m, 'ID_Mesa') || getRobustProp(m, 'ID') || `temp-${index}`;
        return {
          id: String(id),
          nombre: getRobustProp(m, 'Nombre') || getRobustProp(m, 'Mesa') || `Mesa ${id}`,
          estado: (getRobustProp(m, 'Estado') || 'disponible').toLowerCase(),
          pedido_id: getRobustProp(m, 'ID_Pedido') || getRobustProp(m, 'Pedido') || null,
          cliente: getRobustProp(m, 'Cliente') || getRobustProp(m, 'Nombre_Cliente') || null,
          capacidad: parseInt(getRobustProp(m, 'Capacidad')) || 4
        };
      });
    
    apiCache.tables = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error('Error fetching tables:', error);
    return apiCache.tables.data || [];
  }
};

/**
 * Update table status
 */
export const updateTableStatus = async (tableId, status, orderId = '', clientName = '') => {
  try {
    const payload = {
      action: "UPSERT",
      sheet: "Mesas",
      idField: "ID_Mesa",
      data: {
        'ID_Mesa': String(tableId),
        'Estado': status,
        'ID_Pedido': orderId,
        'Cliente': clientName,
        'UltimaActualizacion': new Date().toISOString()
      }
    };
    console.log('🚀 ENVIANDO A GOOGLE SHEETS (UPSERT):', JSON.stringify(payload, null, 2));
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const result = await response.json();
    console.log('📥 RESPUESTA DEL SERVIDOR:', result);
    return result;
  } catch (error) {
    console.error('❌ ERROR EN updateTableStatus:', error);
    return { success: false };
  }
};

/**
 * Hard reset a table: simple UPSERT cleanup
 */
export const hardResetTable = async (tableId, tableName = '', capacity = 4) => {
  try {
    console.log(`🧹 LIMPIANDO MESA (UPSERT): ${tableId} (${tableName})`);
    const payload = {
      action: "UPSERT",
      sheet: "Mesas",
      idField: "ID_Mesa",
      data: {
        'ID_Mesa': String(tableId),
        'Nombre': tableName || String(tableId),
        'Estado': 'disponible',
        'ID_Pedido': '',
        'Cliente': '',
        'Capacidad': capacity,
        'UltimaActualizacion': new Date().toISOString()
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('❌ Error in hardResetTable:', error);
    return { success: false };
  }
};

/**
 * Delete an order from the pedidos sheet
 */
export const deleteOrder = async (orderId) => {
  try {
    console.log('🗑️ BORRANDO PEDIDO:', orderId);
    const payload = {
      action: 'DELETE',
      sheet: 'Pedidos',
      idField: 'ID_Pedido',
      data: { 'ID_Pedido': String(orderId) }
    };
    
    console.log('🗑️ ENVIANDO DELETE A GAS:', JSON.stringify(payload, null, 2));
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const result = await response.json();
    console.log('📥 RESULTADO DELETE:', result);
    return result;
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    return { success: false };
  }
};

/**
 * Update or Add a delivery rider
 */
export const updateDelivery = async (deliveryData) => {
  try {
    let finalRiderId = deliveryData.id_delivery || deliveryData.id;
    let idUser = deliveryData.id_user || (deliveryData.id && deliveryData.id.length > 20 ? deliveryData.id : '');

    // 🛡️ REFUERZO DE UNICIDAD: Buscar si este usuario ya existe para NO duplicar filas
    const allDeliveries = await fetchDeliveries();
    
    const existing = allDeliveries.find(d => {
      const dIdUser = String(getRobustProp(d, 'id_user') || '').trim();
      const dIdDelivery = String(d.id || d.id_delivery || '').trim(); // Priorizamos 'id'
      
      return (idUser && dIdUser === idUser) || 
             (idUser && dIdDelivery === idUser) ||
             (finalRiderId && dIdDelivery === finalRiderId);
    });

    if (existing) {
      finalRiderId = existing.id || existing.id_delivery;
      idUser = idUser || getRobustProp(existing, 'id_user');
    } else if (finalRiderId && finalRiderId.length > 20) {
      idUser = finalRiderId;
      finalRiderId = await getNextId('Deliverys', 'DLV');
    }

    if (!finalRiderId) {
      finalRiderId = await getNextId('Deliverys', 'DLV');
    }

    const payload = {
      action: "UPSERT", 
      sheet: cachedDeliverySheet || "Deliverys", 
      idField: "ID_UserType", 
      data: {
        'id_user': idUser,
        'ID_UserType': finalRiderId, 
        'ID_Delivery': finalRiderId,
        'ID_Rider': finalRiderId,
        'Nombre': deliveryData.nombre || (existing ? existing.nombre : ''),
        'Apellido': deliveryData.apellido || (existing ? existing.apellido : ''),
        'Telefono': deliveryData.telefono || (existing ? existing.telefono : ''),
        'Whatsapp': deliveryData.whatsapp || (existing ? existing.whatsapp : ''),
        'Vehiculo': deliveryData.vehiculo || (existing ? existing.vehiculo : 'Vehículo'),
        'Costo_Pedido': deliveryData.costo_pedido || (existing ? existing.costo_pedido : 50),
        'Cartera': deliveryData.cartera !== undefined ? deliveryData.cartera : (existing ? existing.cartera : 0),
        'Rapidez': deliveryData.rapidez || (existing ? existing.rapidez : 5),
        'Servicio': deliveryData.servicio || (existing ? existing.servicio : 5),
        'Honestidad': deliveryData.honestidad || (existing ? existing.honestidad : 5),
        'Activo': (deliveryData.activo !== undefined ? deliveryData.activo : (existing ? existing.activo : false)) ? 'TRUE' : 'FALSE',
        'Disponible': (deliveryData.activo !== undefined ? deliveryData.activo : (existing ? existing.activo : false)) ? 'TRUE' : 'FALSE',
        'Estado': (deliveryData.activo !== undefined ? deliveryData.activo : (existing ? existing.activo : false)) ? 'Activo' : 'Inactivo',
        'Foto': deliveryData.foto || (existing ? existing.foto : '')
      }
    };

    console.log(`[DEBUG] Enviando UPSERT a Deliverys (ID=${finalRiderId})`);

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const result = await response.json();
    console.log(`[API] Resultado updateDelivery:`, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('Error updating delivery:', error);
    throw error;
  }
};

export const updateOrderFinalDetails = async (orderId, details) => {
  try {
    console.log(`[API] Guardando detalles finales para ${orderId}:`, details);
    return await updateOrderStatus(orderId, details.Estado || 'pending', {
        'Metodo': details.metodo,
        'Pagado': details.Pagado,
        'Devuelta': details.Devuelta
    });
  } catch (error) {
    console.error('Error updateOrderFinalDetails:', error);
    throw error;
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
        'ID_Pedido': detailData.orderId, // Ahora recibe el PEDxx para el vínculo interno
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
    // ID Interno (PEDxx) -> Ahora será el ID_Pedido principal
    const internalId = await getNextId('pedidos', 'PED');
    
    // ID Externo (ORD-xxxx) -> Se guardará en ID_Orden
    const externalId = orderData.orderId || orderData.ID_Pedido || `ORD-${Date.now()}`;

    const itemsList = orderData.items || [];
    const itemsJson = JSON.stringify(itemsList.map(it => ({
      nombre: it.nombre,
      cantidad: it.cantidad,
      precio: it.precio,
      notas: it.notas || ''
    })));
    
    const payload = {
      action: "ADD",
      sheet: orderData.sheet || "pedidos",
      data: {
        'ID_Pedido': internalId,
        'ID_Orden': externalId,
        'ID_Usuario': orderData.userId || '',
        'Cliente': orderData.Cliente || orderData.cliente || 'Invitado',
        'Email': orderData.Email || orderData.usuario || orderData.email || '',
        'Total': orderData.Total || orderData.total,
        'Estado': orderData.Estado || 'Pendiente',
        'ID_Rider': orderData.ID_Rider || '',
        'ID_Delivery': orderData.ID_Rider || '',
        'Delivery': orderData.ID_Rider || '',
        'id_repartidor': orderData.id_repartidor || orderData.ID_Rider || '',
        'Entrada': orderData.Entrada || orderData.hora || new Date().toLocaleTimeString(),
        'Fecha': orderData.Fecha || new Date().toLocaleDateString(),
        'Pagado?': orderData.metodo === 'Cash' || orderData.metodo === 'Efectivo' ? 'NO' : 'SI',
        'Pedido_Items': orderData.Pedido_Items || itemsJson,
        'Whatsapp': orderData.Whatsapp || orderData.whatsapp || '',
        'Direccion': orderData.Direccion || orderData.direccion || '',
        'Metodo': orderData.Metodo || orderData.metodo || '',
        'Notas': orderData.Notas || orderData.notas || '',
        'Pagado': orderData.Pagado !== undefined ? orderData.Pagado : '',
        'Devuelta': orderData.Devuelta !== undefined ? orderData.Devuelta : '',
        'Ref_Pago': orderData.Ref_Pago || orderData.ref_pago || '',
        'Delivery?': (orderData['Delivery?'] === true || orderData.tipo === 'delivery' || orderData.Tipo === 'Domicilio' || orderData.Tipo === 'Delivery') ? 'TRUE' : 'FALSE',
        'Tipo': orderData.tipo || orderData.Tipo || 'Local'
      }
    };

    console.log('[API] Guardando pedido con Estado:', payload.data.Estado, 'Rider:', payload.data.ID_Rider);

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const headerResult = await response.json();

    if (headerResult.success || headerResult.status === 'success') {
      const detailPromises = orderData.items.map(item => 
        saveOrderDetail({ orderId: internalId, ...item })
      );
      Promise.all(detailPromises).catch(err => console.error('❌ Error saving details:', err));

      // ✅ MODULARIDAD: Inyectar el pedido nuevo en la caché inmediatamente
      // para que aparezca en la Central de Pedidos sin esperar el ciclo de 45s
      const newOrderForCache = {
        id: internalId,
        ID_Pedido: internalId,
        ID_Orden: externalId,
        id_user: orderData.userId || '',
        email: (orderData.Email || orderData.email || '').toLowerCase().trim(),
        NombreUser: orderData.Cliente || orderData.cliente || 'Invitado',
        Estado: STATUS_MAP.fromExcel(orderData.Estado || 'Pendiente'),
        estado: STATUS_MAP.fromExcel(orderData.Estado || 'Pendiente'),
        Total: orderData.Total || orderData.total || 0,
        total: orderData.Total || orderData.total || 0,
        Fecha: orderData.Fecha || new Date().toLocaleDateString(),
        Tipo: orderData.Tipo || orderData.tipo || 'Local',
        tipo: orderData.Tipo || orderData.tipo || 'Local',
        Direccion: orderData.Direccion || orderData.direccion || '',
        id_repartidor: orderData.ID_Rider || orderData.id_repartidor || '',
        items: orderData.items || [],
        TipoPago: orderData.Metodo || orderData.metodo || '',
        timestamp: Date.now(),
      };

      // Prepend al cache para que salga primero en la lista
      apiCache.kitchenOrders.data = [newOrderForCache, ...apiCache.kitchenOrders.data];
      // Invalidar timestamp para que el próximo sync traiga datos reales de Sheets
      apiCache.kitchenOrders.timestamp = 0;
    }

    return { ...headerResult, internalId, externalId };
  } catch (error) {
    console.error('Error in saveOrder:', error);
    return { success: false, error: error.message };
  }
};

export const saveUser = async (userData) => {
  try {
    let finalUserType = userData.id_usertype || userData.ID_UserType;
    if (!finalUserType) {
      const role = (userData.usertype || userData.UserType || userData.role || 'Cliente').toLowerCase();
      let prefix = 'CLN';
      if (role.includes('admin')) prefix = 'ADM';
      else if (role.includes('mesero')) prefix = 'MSR';
      else if (role.includes('cocina')) prefix = 'CCN';
      else if (role.includes('delivery')) prefix = 'DLV';
      
      finalUserType = await getNextId('Usuarios', prefix);
    }

    const payload = {
      action: "UPSERT",
      sheet: "Usuarios",
      idField: "EmailUser",
      data: {
        'ID_User': userData.id || userData.id_user || userData.email || `user_${Date.now()}`,
        'NombreUser': userData.username || userData.nombreuser || 'Usuario',
        'EmailUser': userData.email || userData.emailuser || '',
        'UserType': userData.role || userData.usertype || 'Cliente',
        'ID_UserType': finalUserType,
        'activo?': userData['activo?'] !== undefined ? userData['activo?'] : true,
        'Empleado?': userData['Empleado?'] !== undefined ? userData['Empleado?'] : (userData['empleado?'] !== undefined ? userData['empleado?'] : false),
        'Area_Trabajo': userData.area_trabajo || userData.Area_Trabajo || 'Global',
        'Fecha': new Date().toLocaleDateString('es-DO'),
        'DireccionUser': userData.direccion || userData.DireccionUser || '',
        'TelefonoUser': userData.telefono || userData.TelefonoUser || ''
      }
    };
    
    console.log('[API] Enviando usuario a Excel:', payload);

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    
    const result = await response.json();
    console.log('[API] Respuesta de Excel:', result);
    return result;
  } catch (error) {
    console.error('Error saving user to sheets:', error);
    return { success: false, error: error.message };
  }
};

export const uploadVoucherImage = async (base64Data, orderId) => {
  try {
    const storageRef = ref(storage, `vouchers/${orderId}_${Date.now()}.jpg`);
    // Quitar el prefijo data:image/jpeg;base64, si existe
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    await uploadString(storageRef, cleanBase64, 'base64');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
    return null;
  }
};

export const uploadProductImage = async (base64Data, productId) => {
  try {
    const storageRef = ref(storage, `products/${productId}.jpg`);
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    await uploadString(storageRef, cleanBase64, 'base64');
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading product image to Firebase:', error);
    return null;
  }
};

export const saveTransferRecord = async (transferData) => {
  try {
    const payload = {
      action: "ADD",
      sheet: "Transferencias",
      data: {
        'Id_tranf': `TRF-${Date.now()}`,
        'Id_transfd': transferData.bankId || '',
        'ID_Pedido': transferData.orderId,
        'Banco': transferData.banco,
        'No_Cuenta': transferData.cuenta,
        'Titular': transferData.titular,
        'Total': transferData.total,
        'fecha': new Date().toISOString(),
        'Pagado?': 'NO',
        'Imag_voucher': transferData.voucherImage || '',
        'Continuar?': 'NO'
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving transfer record:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a basic draft order to 'reserve' a client/table name
 */
export const createDraftOrder = async (orderData) => {
  try {
    // 1. Marcar Mesa como Ocupada
    if (orderData.mesa_id) {
      const tablePayload = {
        action: "UPSERT",
        sheet: "Mesas",
        idField: "ID_Mesa",
        data: {
          'ID_Mesa': String(orderData.mesa_id),
          'Estado': 'ocupada',
          'ID_Pedido': orderData.orderId,
          'Cliente': orderData.cliente,
          'UltimaActualizacion': new Date().toISOString()
        }
      };
      await fetch(CONFIG.GAS_API_URL, { 
        method: 'POST', 
        body: JSON.stringify(tablePayload), 
        redirect: 'follow' 
      }).catch(e => console.warn('Table update fail:', e));
    }

    // 2. Crear cabecera del pedido como Borrador
    const payload = {
      action: "UPSERT",
      sheet: "Pedidos",
      data: {
        'ID_Pedido': orderData.orderId,
        'Cliente': orderData.cliente,
        'Estado': 'borrador',
        'Pagado?': 'NO',
        'Fecha': new Date().toLocaleDateString(),
        'Entrada': new Date().toLocaleTimeString(),
        'Email': orderData.usuario || '',
        'ID_Mesa': orderData.mesa_id ? String(orderData.mesa_id) : ''
      }
    };

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating draft:', error);
    return { success: false };
  }
};


/**
 * Specialized writer for waiter items (direct to cloud)
 */
export const saveWaiterCartItem = async (data) => {
  try {
    const payload = {
      action: "ADD",
      sheet: "pedido detalle",
      data: {
        'ID_Pedido': data.id_carrito,
        'ID_Producto': data.id_producto,
        'Pedido_Items': data.nombre,
        'Cantidad': data.cantidad,
        'Precio_Unitario': data.precio,
        'Notas': data.orderNote || '',
        'Estado': 'borrador',
        'Fecha_Hora': new Date().toISOString()
      }
    };

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving waiter item:', error);
    return { success: false };
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

/**
 * Fetch specific order details
 * @param {string} orderId 
 */
export const fetchOrderDetails = async (orderId) => {
  try {
    const [ordersRes, itemsRes] = await Promise.all([
      fetch(`${CONFIG.GAS_API_URL}?sheet=pedidos`, { redirect: 'follow' }),
      fetch(`${CONFIG.GAS_API_URL}?sheet=pedido detalle`, { redirect: 'follow' })
    ]);

    const ordersData = await ordersRes.json();
    const itemsData = await itemsRes.json();

    const rawOrders = resolveSheetData(ordersData, 'pedidos');
    const rawItems = resolveSheetData(itemsData, 'pedido detalle');

    const order = rawOrders.find(o => String(getRobustProp(o, 'ID_Pedido')) === String(orderId));
    
    if (!order) {
      // Retornar un mock decente si es un ID de prueba o falló temporalmente
      return {
        id: orderId,
        status: 'on_the_way',
        estimatedTime: '15-20 min',
        rider: { name: 'Juan Pérez', phone: '+1234567890', location: { lat: 18.5001, lng: -69.9880 } },
        restaurantLocation: { lat: 18.4861, lng: -69.9312 },
        items: []
      };
    }

    const orderItems = rawItems.filter(i => String(getRobustProp(i, 'ID_Pedido')) === String(orderId));
    let itemsDetectados = [];
    
    if (orderItems.length > 0) {
      const rawItemsCell = getRobustProp(orderItems[0], 'Pedido_Items');
      if (rawItemsCell && typeof rawItemsCell === 'string' && rawItemsCell.trim().startsWith('[')) {
        try { itemsDetectados = JSON.parse(rawItemsCell); } catch (e) {}
      }
    }

    const excelStatus = getRobustProp(order, 'Estado') || 'Pendiente';
    const finalStatus = STATUS_MAP.fromExcel(excelStatus);

    return {
        id: orderId,
        status: finalStatus,
        tipo: getRobustProp(order, 'Tipo') || getRobustProp(order, 'tipo') || 'Domicilio',
        cliente: getRobustProp(order, 'Cliente') || 'Invitado',
        total: parseFloat(getRobustProp(order, 'Total')) || 0,
        estimatedTime: '20-30 min',
        direccion: getRobustProp(order, 'Direccion') || getRobustProp(order, 'direccion') || getRobustProp(order, 'Dirección') || getRobustProp(order, 'Ubicacion') || getRobustProp(order, 'Ubicación') || '',
        hora: getRobustProp(order, 'Entrada'),
        rider: { name: 'Asignando...', phone: '', location: { lat: 18.5001, lng: -69.9880 } },
        restaurantLocation: { lat: 18.4861, lng: -69.9312 }, // Coordenadas fijas o base del negocio
        items: itemsDetectados.length > 0 ? itemsDetectados.map(it => ({
            nombre: it.nombre || it.name || it.product || 'Producto',
            cantidad: it.cantidad || it.quantity || 1,
            precio: it.precio || 0
        })) : orderItems.map(i => ({
            nombre: getRobustProp(i, 'Pedido_Items') || 'Producto',
            cantidad: 1,
            precio: 0
        }))
    };
  } catch (error) {
    return null;
  }
};

/**
 * Delete a user by email/id
 */
export const deleteUser = async (email) => {
  try {
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'DELETE',
        sheet: 'usuarios',
        idField: 'Email',
        data: { Email: email }
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar un producto en la hoja de Google Sheets.
 * @param {Object} productData - Los datos completos del producto a actualizar.
 */
export const updateProduct = async (productData) => {
  try {
    const isSuggestion = productData.isSuggestion;
    const isNew = !productData.id || String(productData.id).trim() === '';

    let payload;

    if (isSuggestion) {
      // 📝 Mapeo para la hoja de "productos sugeridos"
      let finalSgrId = productData.id || '';
      if (!finalSgrId) {
        finalSgrId = await getNextId('productos sugeridos', 'SGR');
      }
      payload = {
        action: isNew ? 'ADD' : 'UPSERT',
        sheet: 'productos sugeridos',
        ...(isNew ? {} : { idField: 'ID_Sugerido' }),
        data: {
          'ID_Sugerido': finalSgrId,
          'Nombre': productData.nombre || productData.name || '',
          'Descripcion': productData.descripcion || productData.description || '',
          'Categoria': productData.categoria || productData.category || '',
          'Subcategoria': productData.subcategoria || productData.subcategory || '',
          'Imagen': productData.imagen || productData.image || '',
          'Precio_sugerido': productData.precio || productData.price || 0,
          'Sugerido_por': productData.suggestedBy || 'Usuario',
          'like': productData.likes || 0,
          'dislike': productData.dislikes || 0,
        }
      };
    } else {
      // 📦 Mapeo para la hoja principal "productos"
      let finalProdId = productData.id || '';
      if (!finalProdId) {
        finalProdId = await getNextId('productos', 'PRD');
      }
      payload = {
        action: isNew ? 'ADD' : 'UPSERT',
        sheet: 'productos',
        ...(isNew ? {} : { idField: 'ID_Producto' }),
        data: {
          'ID_Producto': finalProdId,
          'nombre': productData.nombre || productData.name || '',
          'descripcion': productData.descripcion || productData.description || '',
          'precio': productData.precio || productData.price || 0,
          'descuento': productData.descuento || 0,
          'categoria': productData.categoria || productData.category || '',
          'subcategoria': productData.subcategoria || productData.subcategory || '',
          'imagen': productData.imagen || productData.image || '',
          'agotado': productData.agotado || false,
          'enOferta': productData.enOferta || false,
          'recomendado': productData.recomendado || productData.isSuggestion || false,
          'pre_orden?': productData.isPreOrder || false,
          'tipo_orden': productData.isPreOrder || false,
          'masVendido': productData.masVendido || false,
          'delaCasa': productData.delaCasa || false,
        }
      };
    }

    console.log(`[API] Guardando en "${payload.sheet}" (id=${productData.id || 'NUEVO'})`, payload);

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message };
  }
};

export default {
  fetchProducts,
  mapProductData,
  fetchKitchenOrders,
  fetchOrders,
  updateOrderStatus,
  fetchRiderOrders,
  fetchRiderStats,
  fetchAllUsers,
  fetchDeliveries,
  pingRider,
  setOffline,
  updateDelivery,
  liquidateRiderCash,
  fetchTables,
  updateTableStatus,
  formatPrice,
  fetchUserRoleByEmail,
  fetchReviews,
  fetchOrderDetails,
  saveWaiterCartItem,
  createDraftOrder,
  respondToOffer,
  saveOrder,
  deleteUser,
  updateProduct,
  hardResetTable,
  fetchAlmacen,
  updateAlmacenItem,
  fetchRecetas,
  processInventoryDeduction
};
/**
 * Obtiene los detalles de la ruta real entre dos puntos usando Google Maps Directions API
 * @param {Object} origin {latitude, longitude}
 * @param {Object} destination {latitude, longitude}
 * @returns {Promise<Object>} {distance, duration, polyline, points}
 */
export const getRouteDetails = async (origin, destination) => {
  const apiKey = CONFIG.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('Google Maps API Key no configurada en Config.js');
    return null;
  }

  try {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destinationStr = `${destination.latitude},${destination.longitude}`;
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${apiKey}&mode=driving`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Error en Directions API:', data.status, data.error_message);
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return {
      distance: leg.distance.text,
      distanceValue: leg.distance.value, // metros
      duration: leg.duration.text,
      durationValue: leg.duration.value, // segundos
      polyline: route.overview_polyline.points,
      bounds: route.bounds,
      steps: leg.steps
    };
  } catch (error) {
    console.error('Error fetching route details:', error);
    return null;
  }
};

/**
 * Decodifica una polilínea de Google Maps en un array de coordenadas
 * @param {string} t Polilínea codificada
 * @returns {Array} [{latitude, longitude}]
 */
export const decodePolyline = (t) => {
  let points = [];
  if (!t) return points;
  for (let i = 0, l = 0, r = 0, n = 0, o = 0, s = 0, a = 0, u = 0, c = 0; i < t.length; ) {
    for (n = 0, o = 0, s = 0; (a = t.charCodeAt(i++) - 63), (s |= (31 & a) << o), (o += 5), a >= 32; );
    u = 1 & s ? ~(s >> 1) : s >> 1, (l += u);
    for (n = 0, o = 0, s = 0; (a = t.charCodeAt(i++) - 63), (s |= (31 & a) << o), (o += 5), a >= 32; );
    c = 1 & s ? ~(s >> 1) : s >> 1, (r += c);
    points.push({ latitude: l / 1e5, longitude: r / 1e5 });
  }
  return points;
};
