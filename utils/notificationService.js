import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Configurar el handler de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NOTIFICATION_CHANNEL_ID = 'dsicario-orders';

export const NotificationService = {
  // Solicitar permisos de notificaciones
  requestPermissions: async () => {
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

  // Obtener token de Expo Push
  getExpoPushToken: async () => {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'dsicario-cd723', // Reemplazar con tu project ID
      });
      return tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },

  // Enviar notificación local
  sendLocalNotification: async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Enviar inmediatamente
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  },

  // Notificación de estado de pedido
  notifyOrderStatus: async (orderId, status, message) => {
    const statusMessages = {
      preparing: '🍳 Tu pedido está siendo preparado',
      on_the_way: '🚴 Tu pedido está en camino',
      delivered: '✅ Tu pedido ha sido entregado',
      cancelled: '❌ Tu pedido ha sido cancelado',
    };

    const defaultMessages = {
      preparing: `Tu pedido #${orderId} está siendo preparado con cariño`,
      on_the_way: `Tu pedido #${orderId} ya va en camino`,
      delivered: `¡Tu pedido #${orderId} ha arrivedo! Disfrútalo`,
      cancelled: `Tu pedido #${orderId} ha sido cancelado`,
    };

    const title = statusMessages[status] || 'DSicario';
    const body = message || defaultMessages[status] || message;

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
