import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../utils/showAlert';
import NotificationService from '../utils/notificationService';
import UpdateService from '../utils/UpdateService';
import {
  getLocalNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearLocalNotifications,
  deleteNotification,
} from '../utils/notifications';

const NotificationsScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { user } = useAuth();
  const { role } = useUser();
  const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'owner';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => { 
    loadNotifications(); 
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      if (Platform.OS === 'web') {
        const permission = await NotificationService.requestWebPermission();
        setNotificationsEnabled(permission);
      } else {
        const stored = await AsyncStorage.getItem('@dsicario_notifications_enabled');
        setNotificationsEnabled(stored === 'true');
      }
    } catch (e) {
      setNotificationsEnabled(false);
    }
  };

  const toggleNotifications = async (value) => {
    try {
      if (Platform.OS === 'web') {
        if (value) {
          const granted = await NotificationService.requestWebPermission();
          if (granted) {
            setNotificationsEnabled(true);
            await NotificationService.sendLocalNotification(
              '🔔 ¡Alertas Activadas!',
              'Ahora recibirás notificaciones de tus pedidos en este navegador.'
            );
            showAlert('Éxito', '¡Notificaciones del navegador habilitadas!');
          } else {
            showAlert(
              'Aviso',
              'No se pudieron habilitar las notificaciones. Para activarlas manualmente, haz clic en el candado de la barra de direcciones del navegador.'
            );
          }
        } else {
          setNotificationsEnabled(false);
          showAlert(
            'Notificaciones Desactivadas',
            'Las alertas locales han sido silenciadas en esta sesión.'
          );
        }
      } else {
        setNotificationsEnabled(value);
        await AsyncStorage.setItem('@dsicario_notifications_enabled', String(value));
      }
    } catch (e) {
      showAlert('Error', 'No se pudieron actualizar las notificaciones.');
    }
  };

  const testNotification = async () => {
    try {
      const sent = await NotificationService.sendLocalNotification(
        '🔔 Notificación de Prueba',
        '¡Funciona! Las notificaciones están activas y llegando correctamente.'
      );
      if (!sent && Platform.OS === 'web') {
        showAlert('Sin permiso', 'Activa las notificaciones con el switch de arriba primero.');
      }
    } catch (e) {
      showAlert('Error', 'No se pudo enviar la notificación de prueba.');
    }
  };

  const loadNotifications = async () => {
    try {
      const stored = await getLocalNotifications();
      setNotifications(stored);
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    await markNotificationRead(id);
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
  };

  const markAllAsRead = async () => {
    await markAllNotificationsRead();
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
  };

  const clearAll = async () => {
    await clearLocalNotifications();
    setNotifications([]);
  };

  const handleDeleteNotification = async (id) => {
    await deleteNotification(id);
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diff = Math.floor((now - notifTime) / 1000);

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return notifTime.toLocaleDateString();
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'order': return 'receipt';
      case 'delivery': return 'motorcycle';
      case 'kitchen': return 'fire';
      case 'payment': return 'credit-card';
      case 'system': return 'cog';
      default: return 'bell';
    }
  };

  const getNotifColor = (type) => {
    switch (type) {
      case 'order': return '#3498DB';
      case 'delivery': return '#27AE60';
      case 'kitchen': return '#E67E22';
      case 'payment': return '#9B59B6';
      case 'system': return '#95A5A6';
      default: return colors.primary;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.xl, alignItems: 'center', backgroundColor: colors.primary,
      borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...shadows.medium, marginBottom: spacing.lg,
    },
    backBtn: { position: 'absolute', top: spacing.xl, left: spacing.md, zIndex: 10, padding: 10 },
    headerIcon: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF',
      justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, ...shadows.small,
    },
    headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: '#FFFFFF' },
    headerSubtitle: { fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)' },
    actionsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: 8 },
    actionBtn: {
      flex: 1, paddingVertical: 8, borderRadius: borders.radius.md, alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    actionText: { fontSize: 12, fontWeight: 'bold', color: colors.text.secondary },
    actionTextPrimary: { color: '#FFFFFF' },
    listContent: { paddingHorizontal: spacing.md, paddingBottom: 100 },
    notifCard: {
      backgroundColor: colors.surface, borderRadius: borders.radius.lg, padding: spacing.md,
      marginBottom: spacing.sm, ...shadows.small, flexDirection: 'row', alignItems: 'center',
      borderLeftWidth: 4,
    },
    notifCardUnread: { backgroundColor: colors.primary + '08' },
    notifIcon: {
      width: 40, height: 40, borderRadius: 20, justifyContent: 'center',
      alignItems: 'center', marginRight: spacing.md,
    },
    notifContent: { flex: 1 },
    notifTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text.primary },
    notifMessage: { fontSize: typography.sizes.sm, color: colors.text.secondary, marginTop: 2 },
    notifTime: { fontSize: 10, color: colors.text.secondary, marginTop: 4 },
    notifDot: {
      width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
      marginLeft: spacing.sm,
    },
    deleteBtn: { padding: 8 },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 48, color: colors.border, marginBottom: spacing.md },
    emptyText: { color: colors.text.secondary, fontSize: typography.sizes.md },
  }), [colors, darkMode]);

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.read && styles.notifCardUnread, { borderLeftColor: getNotifColor(item.type) }]}
      onPress={() => markAsRead(item.id)}
      onLongPress={() => handleDeleteNotification(item.id)}
    >
      <View style={[styles.notifIcon, { backgroundColor: getNotifColor(item.type) + '15' }]}>
        <FontAwesome5 name={getNotifIcon(item.type)} size={18} color={getNotifColor(item.type)} />
      </View>
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.notifTime}>{getTimeAgo(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.notifDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <FontAwesome5 name="bell" size={32} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <Text style={styles.headerSubtitle}>
          {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
        </Text>
      </View>

      <View style={[styles.settingsCard, { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md, borderRadius: borders.radius.lg, ...shadows.small }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.notifIcon, { backgroundColor: colors.primary + '15' }]}>
              <FontAwesome5 name="bell" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text.primary }}>Notificaciones Push</Text>
              <Text style={{ fontSize: typography.sizes.sm, color: colors.text.secondary }}>Recibir alertas de pedidos</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="white"
          />
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.actionBtn, { marginTop: spacing.md, backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
            onPress={testNotification}
          >
            <FontAwesome5 name="paper-plane" size={14} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Probar Notificación</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.settingsCard, { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md, borderRadius: borders.radius.lg, ...shadows.small }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.notifIcon, { backgroundColor: colors.primary + '15' }]}>
            <FontAwesome5 name="download" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text.primary }}>Actualización de App</Text>
            <Text style={{ fontSize: typography.sizes.sm, color: colors.text.secondary }}>Buscar nuevas versiones disponibles</Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: borders.radius.md }}
            onPress={() => UpdateService.checkUpdate(true)}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Buscar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {notifications.length > 0 && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={markAllAsRead}>
            <Text style={styles.actionText}>Marcar todo leído</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: '#E74C3C' }]} onPress={clearAll}>
            <Text style={[styles.actionText, { color: '#E74C3C' }]}>Limpiar todo</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="bell-slash" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No hay notificaciones</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationsScreen;
