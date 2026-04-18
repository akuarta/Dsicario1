import { CONFIG } from '../constants/Config';

// Caché temporal para evitar race-conditions en el monitor de cocina
const pendingUpdates = {};
const UPDATE_LOCK_MS = 10000; // 10 segundos de bloqueo post-update
let cachedDeliverySheet = 'Deliverys';

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
      'draft': 'borrador'
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
      'completado': 'ready',
      'propuesta': 'proposal',
      'borrador': 'draft'
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
    
    if (info.length > 0) {
      // Buscar la primera fila que realmente tenga datos (al menos un nombre)
      const b = info.find(row => 
        getRobustProp(row, 'NombreLocal') || 
        getRobustProp(row, 'nombrelocal')
      ) || info[0];

      return {
        name:    getRobustProp(b, 'NombreLocal') || 'D´Sicario',
        phone:   getRobustProp(b, 'TelefonoLocal') || '809-000-0000',
        email:   getRobustProp(b, 'EmailLocal') || 'ventas@dsicario.com',
        address: getRobustProp(b, 'DireccionLocal') || 'República Dominicana',
        logo:    getRobustProp(b, 'Logo') || null,
        appLink: getRobustProp(b, 'Link App') || null,
        closed:  getRobustProp(b, 'Cerrado?') === true || getRobustProp(b, 'cerrado?') === true
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
      closed: false
    };
  } catch (error) {
    console.error('Error fetching business info:', error);
    return {
      name: 'D´Sicario',
      phone: '809-000-0000',
      email: 'hairoman28@gmail.com',
      address: 'Calle diagonal 1ra. no. 29, Santo Tomas De Aquino',
      logo: null,
      appLink: null,
      closed: false
    };
  }
};


/**
 * Update order status inside Google Sheets (allows extra fields like ID_Rider)
 */
export const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
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

    return response;
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
};

/**
 * Responder a una propuesta de despacho (Aceptar/Rechazar)
 */
export const respondToOffer = async (orderId, riderId, accept = true) => {
  // Limpiar el lock local para que el polling del cliente vea el estado real
  const lockKey = String(orderId);
  delete pendingUpdates[lockKey];

  return await updateOrderStatus(orderId, accept ? 'ready' : 'rechazado', {
    ID_Rider: accept ? riderId : '',
    ID_Pedido: orderId
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
          ID_Orden: orderId, // Alias para OrderCenterScreen
          cliente: (getRobustProp(order, 'Cliente') || 'Invitado').replace('\n', '').trim(),
          NombreUser: (getRobustProp(order, 'Cliente') || 'Invitado'), // Alias para OrderCenterScreen
          email: getRobustProp(order, 'Email') || getRobustProp(order, 'email') || getRobustProp(order, 'usuario') || getRobustProp(order, 'Usuario') || '',
          id_user: getRobustProp(order, 'ID_Usuario') || '', // Alias para OrderCenterScreen
          id_usuario: getRobustProp(order, 'ID_Usuario') || '',
          items: itemsDetectados.length > 0 ? itemsDetectados.map(it => ({
            nombre: it.nombre || it.name || it.product || 'Producto',
            cantidad: it.cantidad || it.quantity || 1,
            notas: it.notas || it.notes || ''
          })) : orderItems.map(i => ({
            nombre: getRobustProp(i, 'Pedido_Items') || 'Producto',
            cantidad: 1
          })), 
          estado: finalStatus,
          Estado: finalStatus, // Alias para OrderCenterScreen
          hora: getRobustProp(order, 'Entrada') || '',
          total: parseFloat(getRobustProp(order, 'Total')) || 0,
          Total: parseFloat(getRobustProp(order, 'Total')) || 0, // Alias para OrderCenterScreen
          mesa: getRobustProp(order, 'ID_Mesa') || getRobustProp(order, 'Mesa') || '',
          tipo: getRobustProp(order, 'Tipo') || (getRobustProp(order, 'ID_Mesa') ? 'Mesa' : 'Local'),
        };
      });
  } catch (error) {
    console.error('Error in fetchKitchenOrders:', error);
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
        const dRiderId = String(getRobustProp(d, 'ID_Rider') || '').trim();
        const excelStatus = (getRobustProp(d, 'Estado') || '').toLowerCase();
        
        // Mostrar si:
        // 1. Está asignado a este repartidor
        // 2. O si NO está asignado a nadie Y el estado es "Listo" (disponible para recoger)
        // Solo hay match si AMBOS IDs existen y no están vacíos
        const isAssignedToMe = dRiderId !== '' && riderId !== '' && dRiderId === riderId;
        const isAvailableToPick = (dRiderId === '' || dRiderId === 'n/a') && 
                                  (excelStatus === 'listo' || excelStatus === 'ready');
        
        // También mostrar si está en fase de "Propuesta" para este repartidor específico
        const isProposalForMe = dRiderId !== '' && riderId !== '' && dRiderId === riderId && excelStatus === 'propuesta';
        
        return isAssignedToMe || isAvailableToPick || isProposalForMe;
      })
      .map(d => {
        const orderId = getRobustProp(d, 'ID_Pedido');
        const excelStatus = getRobustProp(d, 'Estado') || 'Listo';
        return {
          id: orderId,
          cliente: getRobustProp(d, 'Cliente') || 'Desconocido',
          total: parseFloat(getRobustProp(d, 'Total')) || 0,
          whatsapp: getRobustProp(d, 'Telefono') || '',
          direccion: getRobustProp(d, 'Direccion') || getRobustProp(d, 'Ubicacion') || '',
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
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=Usuarios`, { redirect: 'follow' });
    const data = await response.json();
    return resolveSheetData(data, 'Usuarios');
  } catch (error) {
    console.error('Error fetching users:', error);
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
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=Usuarios`, { redirect: 'follow' });
    const data = await response.json();
    const users = resolveSheetData(data, 'Usuarios');
    const user = users.find(u => 
      (u.EmailUser || u.emailuser || u.Email || u.email || '').toLowerCase() === email.toLowerCase()
    );

    if (!user) return null;

    return {
      id: user.ID_User || user.ID_Usuario || user.id || '',
      nombre: user.NombreUser || user.Nombre || user.username || '',
      rol: user.UserType || user.Role || user.rol || 'Cliente'
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
    // Intentar con varios nombres comunes por si acaso
    const sheetsToTry = ['Deliverys', 'Delivery', 'Repartidores'];
    let raw = [];
    
    let foundSheet = 'Deliverys';
    for (const sheetName of sheetsToTry) {
        const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=${sheetName}`, { redirect: 'follow' });
        const data = await response.json();
        raw = resolveSheetData(data, sheetName);
        if (raw.length > 0) {
          foundSheet = sheetName;
          break;
        }
    }
    
    // GUARDAR NOMBRE DE HOJA DETECTADO
    cachedDeliverySheet = foundSheet;
    console.log('API: Hoja de Delivery detectada:', cachedDeliverySheet);
    
    if (raw.length === 0) {
        // Si no funcionó con nombres específicos, pedir todo y buscar cualquier cosa que parezca de repartidores
        const response = await fetch(`${CONFIG.GAS_API_URL}`, { redirect: 'follow' });
        const data = await response.json();
        const firstKey = Object.keys(data).find(k => k.toLowerCase().includes('delivery') || k.toLowerCase().includes('repartid'));
        if (firstKey) raw = data[firstKey];
    }
    
    return raw.map(d => {
        const id = getRobustProp(d, 'ID_Delivery') || getRobustProp(d, 'ID_Rider') || getRobustProp(d, 'id') || Math.random().toString();
        const rawActivo = String(getRobustProp(d, 'Activo') || getRobustProp(d, 'Disponible') || getRobustProp(d, 'Estado') || '').toLowerCase().trim();
        const isActive = rawActivo === 'true' || rawActivo === 'si' || rawActivo === 'activo' || rawActivo === '1' || rawActivo === 'disponible';

        // Intentar obtener el nombre de varias fuentes muy variadas incluyendo paréntesis
        const nombreDetectado = getRobustProp(d, 'Nombre') || 
                               getRobustProp(d, 'Nombre(s)') || // 👈 Caso específico de tu Excel
                               getRobustProp(d, 'Rider') || 
                               getRobustProp(d, 'NombreUser') || 
                               id;
        
        const apellidoDetectado = getRobustProp(d, 'Apellido') || 
                                 getRobustProp(d, 'Apellido(s)') || // 👈 Caso específico de tu Excel
                                 '';
        const vehiculo = getRobustProp(d, 'Vehiculo') || getRobustProp(d, 'Moto') || getRobustProp(d, 'Transporte') || 'Moto';

        return {
          id: String(id),
          id_delivery: String(id),
          nombre: nombreDetectado,
          apellido: apellidoDetectado,
          telefono: getRobustProp(d, 'Telefono') || '',
          whatsapp: getRobustProp(d, 'Whatsapp') || '',
          vehiculo: vehiculo,
          costo_pedido: parseFloat(getRobustProp(d, 'Costo_Pedido')) || 50,
          cartera: parseFloat(getRobustProp(d, 'Cartera')) || 0,
          deuda_efectivo: parseFloat(getRobustProp(d, 'Deuda_Efectivo')) || 0,
          rapidez: parseFloat(getRobustProp(d, 'Rapidez')) || 5.0,
          servicio: parseFloat(getRobustProp(d, 'Servicio')) || 5.0,
          honestidad: parseFloat(getRobustProp(d, 'Honestidad')) || 5.0,
          activo: isActive,
          foto: getRobustProp(d, 'Foto') || '',
          pushToken: getRobustProp(d, 'PushToken') || getRobustProp(d, 'Push_Token') || null,
          callmebotKey: getRobustProp(d, 'CallmebotKey') || getRobustProp(d, 'Callmebot_Key') || null,
          pedidos_dia: parseInt(getRobustProp(d, 'Pedidos_Dia')) || 0,
          pedidos_semana: parseInt(getRobustProp(d, 'Pedidos_Semana')) || 0,
          ingreso_dia: parseFloat(getRobustProp(d, 'Ingreso_Dia')) || 0
        };
      });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    console.error('Error fetching global deliveries:', error);
    return [];
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
      idField: "ID_Delivery",
      data: {
        'ID_Delivery': String(riderId),
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
    const response = await fetch(`${CONFIG.GAS_API_URL}?sheet=Mesas`, { redirect: 'follow' });
    const data = await response.json();
    const raw = resolveSheetData(data, 'Mesas');
    
    return raw
      .filter(m => getRobustProp(m, 'ID_Mesa') || getRobustProp(m, 'Nombre'))
      .map((m, index) => {
        const id = getRobustProp(m, 'ID_Mesa') || getRobustProp(m, 'ID') || `temp-${index}`;
        return {
          id: String(id),
          nombre: getRobustProp(m, 'Nombre') || getRobustProp(m, 'Mesa') || `Mesa ${id}`,
          estado: (getRobustProp(m, 'Estado') || 'disponible').toLowerCase(),
          pedido_id: getRobustProp(m, 'ID_Pedido') || getRobustProp(m, 'Pedido') || null,
          capacidad: parseInt(getRobustProp(m, 'Capacidad')) || 4
        };
      });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return [];
  }
};

/**
 * Update table status
 */
export const updateTableStatus = async (tableId, status, orderId = '') => {
  try {
    const payload = {
      action: "UPSERT",
      sheet: "Mesas",
      idField: "ID_Mesa",
      data: {
        'ID_Mesa': String(tableId),
        'Estado': status,
        'ID_Pedido': orderId,
        'UltimaActualizacion': new Date().toISOString()
      }
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating table:', error);
    return { success: false };
  }
};

/**
 * Update or Add a delivery rider
 */
export const updateDelivery = async (deliveryData) => {
  try {
    const payload = {
      action: "UPSERT", 
      sheet: cachedDeliverySheet, // Usar la hoja detectada dinÃ¡micamente
      idField: "ID_Delivery", 
      data: {
        'ID_Delivery': deliveryData.id_delivery || deliveryData.id,
        'ID_Rider': deliveryData.id_delivery || deliveryData.id, // Redundancia
        'ID': deliveryData.id_delivery || deliveryData.id, // Redundancia
        'Nombre': deliveryData.nombre,
        'Apellido': deliveryData.apellido,
        'Telefono': deliveryData.telefono,
        'Whatsapp': deliveryData.whatsapp,
        'Vehiculo': deliveryData.vehiculo,
        'Costo_Pedido': deliveryData.costo_pedido,
        'Cartera': deliveryData.cartera,
        'Rapidez': deliveryData.rapidez,
        'Servicio': deliveryData.servicio,
        'Honestidad': deliveryData.honestidad,
        'Activo': deliveryData.activo,
        'Disponible': deliveryData.activo, // Redundancia
        'Estado': deliveryData.activo ? 'Activo' : 'Inactivo', // Redundancia
        'Foto': deliveryData.foto
      }
    };

    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating delivery:', error);
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
    const itemsList = orderData.items || [];
    const itemsJson = JSON.stringify(itemsList.map(it => ({
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
        'ID_Usuario': orderData.userId || '',
        'Cliente': orderData.cliente || 'Invitado',
        'Email': orderData.usuario || orderData.email || '',
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
      action: "UPSERT",
      sheet: "Usuarios",
      idField: "ID_User",
      data: {
        'ID_User': userData.id_user || userData.ID_User || userData.id || userData.emailuser || userData.email || `user_${Date.now()}`,
        'NombreUser': userData.nombreuser || userData.NombreUser || userData.username || 'Usuario',
        'EmailUser': userData.emailuser || userData.EmailUser || userData.email || '',
        'UserType': userData.usertype || userData.UserType || userData.role || 'Cliente',
        'activo?': userData['activo?'] !== undefined ? userData['activo?'] : true,
        'Empleado?': userData['Empleado?'] !== undefined ? userData['Empleado?'] : (userData['empleado?'] !== undefined ? userData['empleado?'] : false),
        'Area_Trabajo': userData.area_trabajo || userData.Area_Trabajo || 'Global'
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
      sheet: "pedidos",
      data: {
        'ID_Pedido': orderData.orderId,
        'Cliente': orderData.cliente,
        'Estado': 'borrador',
        'Pagado?': 'NO',
        'Fecha': new Date().toLocaleDateString(),
        'Entrada': new Date().toLocaleTimeString(),
        'Email': orderData.usuario || ''
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
        cliente: getRobustProp(order, 'Cliente') || 'Invitado',
        total: parseFloat(getRobustProp(order, 'Total')) || 0,
        estimatedTime: '20-30 min',
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

export default {
  fetchProducts,
  mapProductData,
  fetchKitchenOrders,
  updateOrderStatus,
  fetchRiderOrders,
  fetchRiderStats,
  fetchAllUsers,
  fetchDeliveries,
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
  deleteUser
};