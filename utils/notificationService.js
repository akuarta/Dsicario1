import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ⚠️ NO llamar setNotificationHandler aquí.
//    Solo notifications.js lo gestiona para evitar conflictos.

const NOTIFICATION_CHANNEL_ID = 'dsicario-orders';

export const NotificationService = {
  // Solicitar permisos de notificaciones
  requestPermissions: async () => {
    // En web, expo-notifications NO es compatible.
    // El permiso web se pide mediante window.Notification directamente.
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      // En web solo reportamos el estado actual (no pedimos desde useEffect).
      return window.Notification.permission === 'granted';
    }
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permisos de notificaciones denegados');
        return false;
      }
      
      // Configurar canal para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
          name: 'Pedidos DSicario',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
          sound: true,
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  },

  /**
   * Pedir permisos de notificación en WEB.
   * DEBE llamarse desde un gesto del usuario (onPress de un botón).
   * Los browsers bloquean requestPermission() si no hay gesto del usuario.
   * Retorna true si el permiso fue concedido.
   */
  requestWebPermission: async () => {
    if (Platform.OS !== 'web') return true; // En nativo ya está manejado
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (window.Notification.permission === 'granted') return true;
    if (window.Notification.permission === 'denied') {
      console.warn('[Notif Web] El usuario bloqueó las notificaciones. Debe habilitarlas manualmente en el browser.');
      return false;
    }
    const result = await window.Notification.requestPermission();
    return result === 'granted';
  },

  // Obtener token de Expo Push
  getExpoPushToken: async () => {
    try {
      if (Platform.OS === 'web') return null;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'f2b86deb-3577-44c9-8400-4ec78784f8f9', // ID real de app.json
      });
      return tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },

  // Enviar notificación local
  sendLocalNotification: async (title, body, data = {}) => {
    console.log(`[Notif Service] Intentando enviar: "${title}" - "${body}"`, { platform: Platform.OS });
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          console.log(`[Notif Web] Permiso actual: ${window.Notification.permission}`);
          if (window.Notification.permission === 'granted') {
            const n = new window.Notification(title, { 
              body, 
              icon: '/favicon.png',
              badge: '/favicon.png',
              requireInteraction: true
            });
            n.onclick = () => {
              window.focus();
              n.close();
            };
            console.log('[Notif Web] Objeto Notification creado con éxito');
          } else {
            console.warn('[Notif Web] Las notificaciones no están habilitadas o están bloqueadas en este navegador. Permiso:', window.Notification.permission);
          }
        } else {
          console.warn('[Notif Web] El navegador no soporta Notificaciones.');
        }
      } else {
        console.log('[Notif Native] Programando notificación local...');
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
            sound: true,
          },
          trigger: null, // Enviar inmediatamente
        });
        console.log('[Notif Native] Notificación programada correctamente');
      }
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  },

  // Notificación de estado de pedido
  notifyOrderStatus: async (orderId, status, message) => {
    // Mapa completo: estados normalizados (inglés) + estados crudos en español del backend
    const statusMessages = {
      // Estados normalizados (lo que devuelve STATUS_MAP.fromExcel)
      pending:        '📋 Pedido Recibido',
      preparing:      '🍳 Tu pedido está siendo preparado',
      ready:          '✅ ¡Tu pedido está listo!',
      on_the_way:     '🛵 Tu pedido está en camino',
      delivered:      '🎉 ¡Pedido entregado!',
      cancelled:      '❌ Tu pedido ha sido cancelado',
      cancelado_cliente: '❌ Tu pedido fue cancelado',
      proposal:       '🔔 Buscando repartidor...',
      accepted:       '✅ ¡Repartidor aceptó tu pedido!',
      // Estados crudos en español (por si llegan sin normalizar)
      pendiente:      '📋 Pedido Recibido',
      preparando:     '🍳 Tu pedido está siendo preparado',
      listo:          '✅ ¡Tu pedido está listo!',
      'en camino':    '🛵 Tu pedido está en camino',
      entregado:      '🎉 ¡Pedido entregado!',
      cancelado:      '❌ Tu pedido ha sido cancelado',
      propuesta:      '🔔 Buscando repartidor...',
      aceptado:       '✅ ¡Repartidor en camino!',
    };

    const defaultMessages = {
      pending:        `Tu pedido #${orderId} fue recibido correctamente`,
      preparing:      `Tu pedido #${orderId} está siendo preparado con cariño`,
      ready:          `¡Tu pedido #${orderId} está listo para entregar!`,
      on_the_way:     `Tu pedido #${orderId} ya va en camino`,
      delivered:      `¡Tu pedido #${orderId} ha llegado! Disfrútalo 😊`,
      cancelled:      `Tu pedido #${orderId} ha sido cancelado`,
      cancelado_cliente: `Tu pedido #${orderId} fue cancelado por ti`,
      proposal:       `Buscando un repartidor para tu pedido #${orderId}`,
      accepted:       `¡Tu repartidor aceptó el pedido #${orderId}!`,
    };

    // Normalizar el status para buscar en el mapa (ignorar mayúsculas/tildes)
    const statusKey = (status || '').toLowerCase().trim();
    const title = statusMessages[statusKey] || statusMessages[status] || '🔔 DSicario';
    const body   = message || defaultMessages[statusKey] || defaultMessages[status] || `Estado del pedido #${orderId}: ${status}`;

    await NotificationService.sendLocalNotification(title, body, { orderId, status });
  },

  // Notificación de oferta
  notifyOffer: async (productName, discount) => {
    await NotificationService.sendLocalNotification(
      '🔥 ¡Oferta Especial!',
      `${productName} tiene ${discount}% de descuento. ¡No te lo pierdas!`
    );
  },

  // Agregar listener para notificaciones
  addNotificationReceivedListener: (handler) => {
    return Notifications.addNotificationReceivedListener(handler);
  },

  // Agregar listener para respuestas de notificación
  addNotificationResponseReceivedListener: (handler) => {
    return Notifications.addNotificationResponseReceivedListener(handler);
  },

  // Limpiar todas las notificaciones
  clearAllNotifications: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};

export default NotificationService;
