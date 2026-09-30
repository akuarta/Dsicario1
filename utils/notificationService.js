import {
  sendLocalNotification,
  notifyOrderStatus,
  notifyOffer,
  requestPermissions,
  requestWebPermission,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  clearAllNotifications,
} from './notifications';

export const NotificationService = {
  requestPermissions,
  requestWebPermission,
  sendLocalNotification,
  notifyOrderStatus,
  notifyOffer,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  clearAllNotifications,
};

export default NotificationService;
