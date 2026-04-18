import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CONFIG } from '../constants/Config';

// Configurar cómo se muestran las notificaciones cuando la App está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─────────────────────────────────────────────
// 📲 CANAL 1: WHATSAPP via CALLMEBOT
// Funciona en web, emulador y dispositivo real.
// Activación única: el repartidor debe enviar
// "I allow callmebot to send me messages" a +34698581511
// y recibirá su apikey personal.
// ─────────────────────────────────────────────

/**
 * Envía un mensaje de WhatsApp al repartidor via CallMeBot (gratuito).
 * @param {string} phone   - Número con código de país, sin +  (ej: 18091234567)
 * @param {string} apiKey  - API Key personal de CallMeBot
 * @param {object} orderData - Datos del pedido
 */
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
// Funciona en localhost/HTTP sin HTTPS ni VAPID.
// El navegador muestra una notificación nativa del sistema.
// ─────────────────────────────────────────────

/**
 * Envía una notificación nativa del navegador (Web Notifications API).
 * Funciona en localhost y HTTP — no requiere HTTPS.
 */
export const sendWebBrowserNotification = async (orderData) => {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[WebNotif] Navegador no soporta Notifications API.');
    return false;
  }

  // Solicitar permiso si aún no está concedido
  if (window.Notification.permission === 'default') {
    await window.Notification.requestPermission();
  }

  if (window.Notification.permission !== 'granted') {
    console.warn('[WebNotif] Permiso de notificación denegado.');
    return false;
  }

  try {
    const notif = new window.Notification('🛵 ¡Nuevo Pedido!', {
      body: `Cliente: ${orderData.cliente || 'Desconocido'}\nTotal: $${orderData.total || 0}\n⏰ Tienes 15 segundos para aceptarlo.`,
      icon: '/favicon.png',
      badge: '/favicon.png',
      requireInteraction: true, // No se cierra sola hasta que el usuario actúe
      tag: `order-${orderData.orderId}`,  // Evita duplicados
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    console.log('[WebNotif] Notificación del navegador enviada ✅');
    return true;
  } catch (e) {
    console.error('[WebNotif] Error:', e.message);
    return false;
  }
};

// ─────────────────────────────────────────────
// 🔀 NOTIFICADOR DUAL (Web primero, luego WhatsApp, luego Expo Push)
// ─────────────────────────────────────────────

/**
 * Notifica al repartidor usando el mejor canal disponible.
 * Prioridad: Web Browser Notification > WhatsApp (CallMeBot) > Expo Push
 */
export const notifyRider = async (rider, orderData) => {
  let notified = false;

  // Canal 1: Web Notification del navegador (web/localhost sin HTTPS)
  if (Platform.OS === 'web') {
    notified = await sendWebBrowserNotification(orderData);
    if (notified) console.log('[Notif] Repartidor notificado vía Web Browser ✅');
  }

  // Canal 2: WhatsApp vía CallMeBot
  if (!notified && rider?.whatsapp && rider?.callmebotKey) {
    notified = await sendWhatsAppNotification(rider.whatsapp, rider.callmebotKey, orderData);
    if (notified) console.log('[Notif] Repartidor notificado vía WhatsApp ✅');
  }

  // Canal 3: Expo Push Notification (dispositivo físico)
  if (!notified && rider?.pushToken) {
    notified = await sendRiderPushNotification(rider.pushToken, orderData);
    if (notified) console.log('[Notif] Repartidor notificado vía Expo Push ✅');
  }

  if (!notified) {
    console.warn('[Notif] Sin canal disponible para notificar al repartidor.');
  }

  return notified;
};

// ─────────────────────────────────────────────
// 🔔 CANAL 2: EXPO PUSH (producción / dispositivo físico)
// ─────────────────────────────────────────────

export const registerForPushNotifications = async () => {
  // En web usamos la Web Notifications API en su lugar
  if (Platform.OS === 'web') {
    console.log('[Notif] Web: usando Web Notifications API.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notif] Permiso de notificaciones denegado.');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '2c2e9a21-fda9-4b1b-b4e6-0a9a3d8a43f5',
  })).data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rider-orders', {
      name: 'Pedidos de Repartidor',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
    });
  }

  console.log('[Notif] Expo Push Token:', token);
  return token;
};

export const saveRiderPushToken = async (riderId, pushToken) => {
  if (!pushToken) return;
  try {
    const payload = {
      action: 'UPSERT',
      sheet: 'Deliverys',
      idField: 'ID_Delivery',
      data: { 'ID_Delivery': riderId, 'PushToken': pushToken }
    };
    await fetch(CONFIG.GAS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
  } catch (e) {
    console.error('[Notif] Error guardando PushToken:', e);
  }
};

export const sendRiderPushNotification = async (pushToken, orderData) => {
  if (!pushToken) return false;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
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
    return result?.data?.status === 'ok';
  } catch (e) {
    console.error('[PushExpo] Error:', e);
    return false;
  }
};

export const setupNotificationResponseListener = (onNotificationTapped) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (onNotificationTapped) onNotificationTapped(data);
  });
  return () => subscription.remove();
};
