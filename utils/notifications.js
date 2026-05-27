import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { CONFIG } from '../constants/Config';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  ÚNICO setNotificationHandler de toda la app.
//     notificationService.js NO debe llamarlo — solo este archivo lo hace.
// ─────────────────────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

  const body =
    `🛵 *¡NUEVO PEDIDO!*\n\n` +
    `📦 Pedido: #${String(orderData.orderId || '').slice(-6)}\n` +
    `👤 Cliente: ${orderData.cliente || 'Desconocido'}\n` +
    `💰 Total: $${orderData.total || 0}\n` +
    `📍 Dirección: ${orderData.direccion || 'Domicilio (App)'}\n\n` +
    `⏰ Tienes *15 segundos* para aceptarlo en la App DSicario.\n` +
    `Si no respondes, el pedido irá al modo Random.`;

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
// 🔔 EXPO PUSH: Registro y envío
// ─────────────────────────────────────────────

/**
 * Configura los canales de Android.
 * ✅ Se llama ANTES de obtener el Expo Push Token.
 */
const setupAndroidChannels = async () => {
  if (Platform.OS !== 'android') return;
  await Promise.all([
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
  if (Platform.OS === 'web') {
    console.log('[Notif] Web: usando Web Notifications API.');
    return null;
  }

  try {
    // 1. Configurar canales Android PRIMERO
    await setupAndroidChannels();

    // 2. Pedir permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notif] ❌ Permiso de notificaciones denegado.');
      Alert.alert('Aviso', 'Permiso de notificaciones denegado. No recibirás alertas de nuevos pedidos.');
      return null;
    }

    // 3. Obtener token — hardcodeado como fallback seguro
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'f2b86deb-3577-44c9-8400-4ec78784f8f9';

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('[Notif] ✅ Expo Push Token:', token);
    return token;
  } catch (error) {
    console.error('[Notif] ❌ Error obteniendo Expo Push Token:', error.message);
    // No mostrar Alert aquí para no bloquear la UI — el fallo es no crítico
    return null;
  }
};

/**
 * Guarda el PushToken del repartidor en Google Sheets.
 * ✅ Incluye Content-Type correcto para que GAS lo acepte.
 */
export const saveRiderPushToken = async (riderId, pushToken) => {
  if (!pushToken || !riderId) return;
  try {
    const payload = {
      action: 'UPSERT',
      sheet: 'Deliverys',
      idField: 'ID_Delivery',
      data: { 'ID_Delivery': riderId, 'PushToken': pushToken },
    };
    const response = await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // ✅ CRÍTICO para GAS
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result?.success || result?.status === 'success') {
      console.log(`[Notif] ✅ PushToken guardado para rider ${riderId}`);
    } else {
      console.warn('[Notif] ⚠️ GAS no confirmó el guardado del PushToken:', result);
    }
  } catch (e) {
    console.error('[Notif] ❌ Error guardando PushToken:', e.message);
  }
};

/**
 * Envía una push notification al repartidor via Expo Push Service.
 */
export const sendRiderPushNotification = async (pushToken, orderData) => {
  if (!pushToken) return false;

  try {
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
        title: '🛵 ¡Nuevo Pedido Disponible!',
        body: `${orderData.cliente || 'Cliente'} | $${orderData.total || 0}`,
        data: { orderId: orderData.orderId, screen: 'RiderScreen', riderId: orderData.riderId },
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
      console.warn('[PushExpo] ⚠️ Respuesta inesperada:', JSON.stringify(result));
      return false;
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
// 🎧 LISTENER de respuesta a notificación
// ─────────────────────────────────────────────
export const setupNotificationResponseListener = (onNotificationTapped) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (onNotificationTapped) onNotificationTapped(data);
  });
  return () => subscription.remove();
};

// ─────────────────────────────────────────────
// 🍽️ CANAL COCINA → MESERO (Orden Lista)
// ─────────────────────────────────────────────

/** @deprecated — Los canales se configuran automáticamente en registerForPushNotifications */
export const setupKitchenChannel = async () => setupAndroidChannels();

export const notifyOrderReady = async (order) => {
  try {
    if (Platform.OS !== 'web') {
      const { Vibration } = require('react-native');
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
    }

    if (Platform.OS === 'web') {
      // En web: usar Browser Notification API
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification('🔔 ¡Pedido Listo para Servir!', {
          body: `👤 ${order.cliente || order.mesa_nombre || 'Mesa'} — Orden #${String(order.id || '').slice(-6)}`,
          icon: '/favicon.png',
        });
      }
      return;
    }

    // En nativo: notificación local
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 ¡Pedido Listo para Servir!',
        body: `👤 ${order.cliente || order.mesa_nombre || 'Mesa'} — Orden #${String(order.id || '').slice(-6)}`,
        data: { orderId: order.id, type: 'KITCHEN_READY', screen: 'WaiterScreen' },
        color: '#22c55e',
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'kitchen-ready' }),
      },
      trigger: null,
    });

    console.log(`[KitchenNotif] ✅ Alerta enviada para orden: ${order.id}`);
  } catch (error) {
    console.warn('[KitchenNotif] Error (no crítico):', error?.message || error);
  }
};
