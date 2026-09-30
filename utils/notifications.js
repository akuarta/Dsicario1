import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { CONFIG } from '../constants/Config';
import { showAlert } from './showAlert';
import { registerExpoPushTokenWeb } from './fcm';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─────────────────────────────────────────────
// 📲 CANAL 1: WHATSAPP via CALLMEBOT
// ─────────────────────────────────────────────
export const sendWhatsAppNotification = async (phone, apiKey, orderData) => {
  if (!phone || !apiKey) {
    console.warn('[WhatsApp] Falta número o API Key del repartidor.');
    return false;
  }

  const body = orderData.customBody || (
    `🛵 *¡NUEVO PEDIDO!*\n\n` +
    `📦 Pedido: #${String(orderData.orderId || '').slice(-6)}\n` +
    `👤 Cliente: ${orderData.cliente || 'Desconocido'}\n` +
    `💰 Total: $${orderData.total || 0}\n` +
    `📍 Dirección: ${orderData.direccion || 'Domicilio (App)'}\n\n` +
    `⏰ Tienes *15 segundos* para aceptarlo en la App DSicario.\n` +
    `Si no respondes, el pedido irá al modo Random.`
  );

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(body)}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    const text = await response.text();
    const ok = text.toLowerCase().includes('queued') || response.ok;
    console.log(`[WhatsApp] Enviado a ${phone}:`, text.substring(0, 80));
    return ok;
  } catch (e) {
    console.error('[WhatsApp] Error:', e.message);
    return false;
  }
};

// ─────────────────────────────────────────────
// 🌐 CANAL WEB: Browser Notification API
// ─────────────────────────────────────────────
export const sendWebBrowserNotification = async (orderData) => {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[WebNotif] Navegador no soporta Notifications API.');
    return false;
  }

  if (window.Notification.permission === 'default') {
    await window.Notification.requestPermission();
  }

  if (window.Notification.permission !== 'granted') {
    console.warn('[WebNotif] Permiso de notificación denegado.');
    return false;
  }

  try {
    const title = '🛵 ¡Nuevo Pedido!';
    const options = {
      body: `Cliente: ${orderData.cliente || 'Desconocido'}\nTotal: $${orderData.total || 0}\n⏰ Tienes 15 segundos para aceptarlo.`,
      icon: '/favicon.png',
      badge: '/favicon.png',
      requireInteraction: true,
      tag: `order-${orderData.orderId}`,
    };

    const n = new window.Notification(title, options);
    n.onshow = () => console.log('[WebNotif] 👁️ Notificación MOSTRADA en pantalla');
    n.onclick = () => { window.focus(); n.close(); };
    n.onerror = (err) => console.error('[WebNotif] ❌ ERROR al mostrar:', err);
    return true;
  } catch (e) {
    console.error('[WebNotif] Error:', e.message);
    return false;
  }
};

// ─────────────────────────────────────────────
// 📢 NOTIFICACIÓN LOCAL (web + nativo)
// ─────────────────────────────────────────────
export const sendLocalNotification = async (title, body, data = {}) => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      const perm = window.Notification.permission;
      const isFocused = typeof document !== 'undefined' && document.hasFocus();
      console.log(`[Notif] Web: permiso="${perm}", focused=${isFocused}, title="${title}"`);
      if (isFocused) {
        console.log('[Notif] ✅ Tab activa — skip alert (usuario ya ve la pantalla)');
        return true;
      }
      if (perm === 'granted') {
        const n = new window.Notification(title, {
          body,
          icon: '/favicon.png',
          badge: '/favicon.png',
          requireInteraction: true,
        });
        n.onclick = function(event) {
          event.preventDefault();
          window.focus();
          if (window.clients && window.clients.openWindow) {
             // For PWA fallback
          }
          n.close();
        };
        console.log('[Notif] ✅ Notificación web creada');
        return true;
      }
      console.warn('[Notif] ❌ Permiso no concedido en web');
      return false;
    } else if (Platform.OS !== 'web') {
      console.log(`[Notif] Nativo: programando notificación "${title}"`);
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: true, channelId: 'default' },
        trigger: null,
      });
      console.log('[Notif] ✅ Notificación nativa programada');
      return true;
    }
    console.warn('[Notif] ❌ No se pudo enviar (web sin soporte o plataforma desconocida)');
    return false;
  } catch (error) {
    console.error('[Notif] ❌ Error enviando notificación local:', error);
    return false;
  }
};

// ─────────────────────────────────────────────
// 🔔 EXPO PUSH: Registro y envío
// ─────────────────────────────────────────────

/**
 * Configura los canales de Android.
 * ✅ Se llama ANTES de obtener el Expo Push Token y en el arranque.
 */
export const setupAndroidChannels = async () => {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync('default', {
      name: 'Alertas Generales',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: true,
    }),
    Notifications.setNotificationChannelAsync('rider-orders', {
      name: 'Pedidos de Repartidor',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: true,
    }),
    Notifications.setNotificationChannelAsync('kitchen-ready', {
      name: '🍽️ Pedido Listo — Cocina',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: '#22c55e',
      sound: true,
      description: 'Alertas cuando la cocina marca un pedido como listo para servir.',
    }),
    Notifications.setNotificationChannelAsync('dsicario-orders', {
      name: 'Pedidos DSicario',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: true,
    }),
  ]);
  console.log('[Notif] ✅ Canales Android configurados');
};

export const registerForPushNotifications = async () => {
  try {
    const isWeb = Platform.OS === 'web';

    if (!isWeb) {
      await setupAndroidChannels();
    }

    if (isWeb) {
      if (typeof Notification === 'undefined') return null;
      if (Notification.permission === 'denied') return null;
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return null;
      }
    } else {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Aviso', 'Permiso de notificaciones denegado. No recibirás alertas de nuevos pedidos.');
        return null;
      }
    }

    if (isWeb) {
      const token = await registerExpoPushTokenWeb();
      if (token) return token;
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'f2b86deb-3577-44c9-8400-4ec78784f8f9';

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch (error) {
    console.error('[Notif] Error obteniendo Expo Push Token:', error.message);
    return null;
  }
};

export const requestPermissions = async () => {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    console.log('[Notif] requestPermissions web, estado actual:', Notification.permission);
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    console.log('[Notif] requestPermissions resultado:', perm);
    return perm === 'granted';
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Notif] Permisos denegados');
      return false;
    }
    await setupAndroidChannels();
    return true;
  } catch (error) {
    console.error('[Notif] Error solicitando permisos:', error);
    return false;
  }
};

export const requestWebPermission = async () => {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (window.Notification.permission === 'granted') return true;
  if (window.Notification.permission === 'denied') {
    console.warn('[Notif Web] Usuario bloqueó notificaciones. Debe habilitarlas manualmente.');
    return false;
  }
  const result = await window.Notification.requestPermission();
  return result === 'granted';
};

export const savePushToken = async (userId, pushToken, sheet = 'Usuarios', idField = 'ID_User', userName) => {
  if (!pushToken || !userId) return;
  try {
    const data = { [idField]: userId, PushToken: pushToken };
    if (sheet === 'Usuarios' && userName) {
      data.NombreUser = userName;
    }
    const payload = {
      action: 'UPSERT',
      sheet,
      idField,
      data,
    };
    console.log('[Notif] Enviando PushToken a GAS:', JSON.stringify(payload));
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log('[Notif] Respuesta GAS:', JSON.stringify(result));
    if (result?.success || result?.status === 'success') {
      console.log(`[Notif] ✅ PushToken guardado para ${idField}=${userId} en ${sheet}`);
    } else {
      console.warn('[Notif] ⚠️ GAS no confirmó el guardado del PushToken:', result);
    }
  } catch (e) {
    console.error('[Notif] ❌ Error guardando PushToken:', e.message);
  }
};

export const saveRiderPushToken = async (riderId, pushToken) => {
  return savePushToken(riderId, pushToken, 'Deliverys', 'ID_Delivery');
};

/**
 * Envía una push notification al repartidor via Expo Push Service.
 */
/**
 * Envía push al rider. Si el token tiene prefijo {FCM}, lo envía vía GAS (FCM HTTP API),
 * de lo contrario usa Expo Push Service.
 */
export const sendRiderPushNotification = async (pushToken, orderData) => {
  if (!pushToken) return false;

  const notifTitle = orderData.customTitle || '🛵 ¡Nuevo Pedido Disponible!';
  const notifBody = orderData.customBody || `${orderData.cliente || 'Cliente'} | $${orderData.total || 0}`;
  const customData = orderData.customData || {};

  // ── Token FCM raw → enrutar vía GAS ──
  if (pushToken.startsWith('{FCM}')) {
    try {
      const body = {
        action: 'SEND_FCM',
        token: pushToken,
        title: notifTitle,
        body: notifBody,
        data: { orderId: orderData.orderId, screen: 'RiderScreen', riderId: orderData.riderId, ...customData },
      };
      const res = await fetch(CONFIG.GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result?.success) {
        console.log(`[PushFCM] ✅ Enviado vía GAS a ${pushToken.slice(-8)}`);
        return true;
      }
      console.warn('[PushFCM] ⚠️ GAS respondió:', JSON.stringify(result));
      return false;
    } catch (e) {
      console.error('[PushFCM] ❌ Error:', e.message);
      return false;
    }
  }

  // ── Token Expo Push → Expo Push Service ──
  try {
    if (Platform.OS === 'web') {
      // 🚀 En Web usamos el Proxy de GAS para evadir CORS de Expo
      const res = await fetch(CONFIG.GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'SEND_EXPO_PUSH',
          token: pushToken,
          title: notifTitle,
          body: notifBody,
          data: { orderId: orderData.orderId, screen: 'RiderScreen', riderId: orderData.riderId, ...customData }
        }),
      });
      const result = await res.json();
      if (result?.success) {
        console.log(`[PushExpoProxy] ✅ Enviado vía GAS a ${pushToken.slice(-8)}`);
        return true;
      } else {
        // Detectar token vencido y limpiar
        const errMsg = result?.data?.message || result?.errorMessage || '';
        if (errMsg.includes('DeviceNotRegistered') && orderData.riderId) {
          console.warn(`[PushExpo] ⚠️ Token inválido para repartidor ${orderData.riderId}. Limpiando...`);
          fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'UPSERT', sheet: 'Deliverys', idField: 'ID_Delivery',
              data: { ID_Delivery: orderData.riderId, PushToken: '' }
            })
          }).catch(() => {});
        }
        console.warn(`[PushExpoProxy] ⚠️ Error del proxy (Expo):`, result.errorMessage || result);
        return false;
      }
    } else {
      // En App nativa usamos llamada directa
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          sound: 'default',
          title: notifTitle,
          body: notifBody,
          data: { orderId: orderData.orderId, screen: 'RiderScreen', riderId: orderData.riderId, ...customData },
          priority: 'high',
          channelId: 'rider-orders',
          badge: 1,
        }),
      });
      const result = await response.json();
      const status = result?.data?.status;
      if (status === 'ok') {
        console.log(`[PushExpo] ✅ Enviado a ${pushToken.slice(-8)}`);
        return true;
      } else {
        // Detectar token vencido y limpiar
        const errDetails = result?.data?.details?.error || '';
        if (errDetails === 'DeviceNotRegistered' && orderData.riderId) {
          console.warn(`[PushExpo] ⚠️ Token inválido para repartidor ${orderData.riderId}. Limpiando...`);
          fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'UPSERT', sheet: 'Deliverys', idField: 'ID_Delivery',
              data: { ID_Delivery: orderData.riderId, PushToken: '' }
            })
          }).catch(() => {});
        }
        console.warn('[PushExpo] ⚠️ Respuesta inesperada:', JSON.stringify(result));
        return false;
      }
    }
  } catch (e) {
    console.error('[PushExpo] ❌ Error:', e.message);
    return false;
  }
};

// ─────────────────────────────────────────────
// 🔀 NOTIFICADOR DUAL
// ─────────────────────────────────────────────
export const notifyRider = async (rider, orderData) => {
  let notified = false;

  // Canal 1: WhatsApp vía CallMeBot
  if (!notified && rider?.whatsapp && rider?.callmebotKey) {
    notified = await sendWhatsAppNotification(rider.whatsapp, rider.callmebotKey, orderData);
    if (notified) console.log('[Notif] Repartidor notificado vía WhatsApp ✅');
  }

  // Canal 2: Expo Push Notification (dispositivo físico)
  if (!notified && rider?.pushToken) {
    notified = await sendRiderPushNotification(rider.pushToken, orderData);
    if (notified) console.log('[Notif] Repartidor notificado vía Expo Push ✅');
  }

  if (!notified) {
    if (!rider?.pushToken && !rider?.callmebotKey) {
      console.log('[Notif] Notificación interna (Polling 🛵). El repartidor verá el pedido en su pantalla.');
      return { success: true, channel: 'internal' };
    }
    console.warn('[Notif] ⚠️ No se pudo enviar notificación externa al repartidor.');
    return { success: false, error: 'No external channels available' };
  }

  return { success: true, notified: true };
};

// ─────────────────────────────────────────────
// 📢 BROADCAST A TODOS LOS REPARTIDORES
// ─────────────────────────────────────────────
export const broadcastToAllRiders = async (orderData) => {
  try {
    const { fetchDeliveries } = require('./api');
    const riders = await fetchDeliveries();
    
    // Filtrar riders activos o con token
    const activeRiders = riders.filter(r => r.PushToken);
    
    if (activeRiders.length === 0) {
      console.log('[Broadcast] No hay repartidores con token para notificar.');
      return;
    }

    console.log(`[Broadcast] Enviando notificación a ${activeRiders.length} repartidores...`);
    
    const notifications = activeRiders.map(r => 
      sendRiderPushNotification(r.PushToken, {
        orderId: orderData.id || orderData.ID_Pedido,
        customTitle: '🛵 ¡Nuevo Pedido para Domicilio!',
        customBody: `Hay un pedido en espera. ¡Abre la app para recogerlo!`,
      })
    );
      
    await Promise.allSettled(notifications);
  } catch(e) {
    console.error('[Broadcast] Error en broadcastToAllRiders:', e);
  }
};

// ─────────────────────────────────────────────
// 🔔 NOTIFICACIONES DE ESTADO
// ─────────────────────────────────────────────
export const notifyOrderStatus = async (orderId, status, message) => {
  const STATUS_MESSAGES = {
    pending: '📋 Pedido Recibido', preparing: '🍳 Tu pedido está siendo preparado',
    ready: '✅ ¡Tu pedido está listo!', on_the_way: '🛵 Tu pedido está en camino',
    delivered: '🎉 ¡Pedido entregado!', cancelled: '❌ Tu pedido ha sido cancelado',
    cancelado_cliente: '❌ Tu pedido fue cancelado', proposal: '🔔 Buscando repartidor...',
    accepted: '✅ ¡Repartidor aceptó tu pedido!',
    pendiente: '📋 Pedido Recibido', preparando: '🍳 Tu pedido está siendo preparado',
    listo: '✅ ¡Tu pedido está listo!', 'en camino': '🛵 Tu pedido está en camino',
    entregado: '🎉 ¡Pedido entregado!', cancelado: '❌ Tu pedido ha sido cancelado',
    propuesta: '🔔 Buscando repartidor...', aceptado: '✅ ¡Repartidor en camino!',
  };
  const DEFAULT_BODIES = {
    pending: `Tu pedido #${orderId} fue recibido correctamente`,
    preparing: `Tu pedido #${orderId} está siendo preparado con cariño`,
    ready: `¡Tu pedido #${orderId} está listo para entregar!`,
    on_the_way: `Tu pedido #${orderId} ya va en camino`,
    delivered: `¡Tu pedido #${orderId} ha llegado! Disfrútalo`,
    cancelled: `Tu pedido #${orderId} ha sido cancelado`,
    cancelado_cliente: `Tu pedido #${orderId} fue cancelado por ti`,
    proposal: `Buscando un repartidor para tu pedido #${orderId}`,
    accepted: `¡Tu repartidor aceptó el pedido #${orderId}!`,
  };
  const key = (status || '').toLowerCase().trim();
  const title = STATUS_MESSAGES[key] || STATUS_MESSAGES[status] || '🔔 DSicario';
  const body = message || DEFAULT_BODIES[key] || DEFAULT_BODIES[status] || `Estado del pedido #${orderId}: ${status}`;
  await sendLocalNotification(title, body, { orderId, status });
};

export const notifyOffer = async (productName, discount) => {
  await sendLocalNotification('🔥 ¡Oferta Especial!', `${productName} tiene ${discount}% de descuento. ¡No te lo pierdas!`);
};

// ─────────────────────────────────────────────
// 🎧 LISTENER de respuesta a notificación
// ─────────────────────────────────────────────
export const setupNotificationResponseListener = (onNotificationTapped) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (onNotificationTapped) onNotificationTapped(data);
  });
  return () => subscription.remove();
};

export const addNotificationReceivedListener = (handler) => {
  return Notifications.addNotificationReceivedListener(handler);
};

export const addNotificationResponseReceivedListener = (handler) => {
  return Notifications.addNotificationResponseReceivedListener(handler);
};

export const clearAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// ─────────────────────────────────────────────
// 🍽️ CANAL COCINA → MESERO (Orden Lista)
// ─────────────────────────────────────────────

/** @deprecated — Los canales se configuran automáticamente en registerForPushNotifications */
export const setupKitchenChannel = async () => setupAndroidChannels();

export const notifyOrderReady = async (order) => {
  try {
    const title = '🔔 ¡Pedido Listo para Servir!';
    const body = `👤 ${order.cliente || order.mesa_nombre || 'Mesa'} — Orden #${String(order.id || '').slice(-6)}`;

    if (Platform.OS !== 'web') {
      const { Vibration } = require('react-native');
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
    }

    await sendLocalNotification(title, body, { orderId: order.id, type: 'KITCHEN_READY', screen: 'WaiterScreen' });
    console.log(`[KitchenNotif] ✅ Alerta enviada para orden: ${order.id}`);
  } catch (error) {
    console.warn('[KitchenNotif] Error (no crítico):', error?.message || error);
  }
};

// Asegurar que los canales de Android se configuren en cuanto la app importa este archivo.
setupAndroidChannels().catch(console.warn);

// ─────────────────────────────────────────────
// 📋 FUNCIONES PARA NOTIFICATIONSSCREEN
// ─────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_LOCAL_KEY = '@dsicario_notifications_local';

export const addNotification = async ({ title, message, type = 'system', data = {} }) => {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_LOCAL_KEY);
    const notifications = stored ? JSON.parse(stored) : [];
    const newNotification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      data,
      read: false,
      timestamp: new Date().toISOString(),
    };
    const updated = [newNotification, ...notifications].slice(0, 50);
    await AsyncStorage.setItem(NOTIFICATIONS_LOCAL_KEY, JSON.stringify(updated));
    return newNotification;
  } catch (e) {
    console.error('Error adding notification:', e);
    return null;
  }
};

export const getUnreadCount = async () => {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_LOCAL_KEY);
    if (!stored) return 0;
    const notifications = JSON.parse(stored);
    return notifications.filter(n => !n.read).length;
  } catch (e) {
    return 0;
  }
};

export const getLocalNotifications = async () => {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_LOCAL_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const markNotificationRead = async (id) => {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_LOCAL_KEY);
    if (!stored) return;
    const notifications = JSON.parse(stored);
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    await AsyncStorage.setItem(NOTIFICATIONS_LOCAL_KEY, JSON.stringify(updated));
  } catch (e) {}
};

export const markAllNotificationsRead = async () => {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_LOCAL_KEY);
    if (!stored) return;
    const notifications = JSON.parse(stored);
    const updated = notifications.map(n => ({ ...n, read: true }));
    await AsyncStorage.setItem(NOTIFICATIONS_LOCAL_KEY, JSON.stringify(updated));
  } catch (e) {}
};

export const clearLocalNotifications = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_LOCAL_KEY);
  } catch (e) {}
};

export const deleteNotification = async (id) => {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_LOCAL_KEY);
    if (!stored) return;
    const notifications = JSON.parse(stored);
    const updated = notifications.filter(n => n.id !== id);
    await AsyncStorage.setItem(NOTIFICATIONS_LOCAL_KEY, JSON.stringify(updated));
  } catch (e) {}
};

