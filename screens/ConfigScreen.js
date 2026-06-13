import { showAlert } from '../utils/showAlert';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCart } from '../contexts/AppContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { TextInput, Modal, ActivityIndicator } from 'react-native';
import { saveUser, saveBusinessInfo, savePaymentMethod, saveTransferDetail, deleteTransferDetail } from '../utils/api';
import Constants from 'expo-constants';
import UpdateService from '../utils/UpdateService';
import NotificationService from '../utils/notificationService';
import LocationPickerModal from '../components/LocationPickerModal';
import LoggerModal from '../components/LoggerModal';
import { getFCMToken } from '../utils/fcm';
import { CONFIG } from '../constants/Config';

const ConfigScreen = () => {
  const [loggerModalVisible, setLoggerModalVisible] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const { darkMode, setThemeMode, themeMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { 
    username, setUsername, 
    address, setAddress, 
    phone, setPhone, 
    role, userTypeId, syncUserRole,
    isSyncing: isUserSyncing
  } = useUser();
  const isAdmin = !!(role && (role.toLowerCase() === 'admin' || role.toLowerCase() === 'owner'));

  useEffect(() => {
    if (Platform.OS === 'web') {
      getFCMToken().then(t => setFcmToken(t || null)).catch(() => {});
    }
  }, []);
  // Inicializar estado de notificaciones según el permiso actual del browser
  const getInitialNotifState = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission === 'granted';
    }
    return true;
  };
  const [notifications, setNotifications] = useState(getInitialNotifState);
  const { exchangeRates, updateExchangeRates, businessInfo, updateBusinessInfo } = useCart();
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const handleSyncProfile = async () => {
    if (!user?.email) return;
    try {
      await syncUserRole(user.email);
      showAlert('Sincronización', 'Tus datos han sido actualizados desde el servidor.');
    } catch (error) {
      showAlert('Error', 'No se pudieron sincronizar los datos.');
    }
  };

  // ✅ Nueva función para obtener la ubicación actual y rellenar lat/long en el modal de datos del negocio
  const handleGetLocation = async () => {
    try {
      // Solicitar permiso si no se ha concedido (solo en dispositivos móviles)
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permiso', 'Permiso de ubicación denegado');
          return;
        }
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc && loc.coords) {
        const { latitude, longitude } = loc.coords;
        setTempUser(prev => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        }));
        showAlert('Éxito', 'Ubicación obtenida y aplicada a los campos.');
      } else {
        showAlert('Error', 'No se pudo obtener la ubicación.');
      }
    } catch (e) {
      console.warn('Error al obtener ubicación:', e);
      showAlert('Error', 'Ocurrió un problema al obtener la ubicación.');
    }
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      await UpdateService.checkUpdate(true);
    } catch (error) {
      console.error('Error checking updates:', error);
      showAlert('Error', 'No se pudo verificar la actualización.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const toggleBusinessStatus = async () => {
    const newStatus = !businessInfo?.closed;
    setIsSaving(true);
    try {
      const payload = {
        ...businessInfo,
        closed: newStatus
      };
      const result = await saveBusinessInfo(payload);
      if (result && result.success) {
        updateBusinessInfo(payload);
        showAlert(
          newStatus ? '🌙 Modo Pre-orden' : '☀️ Negocio Abierto',
          newStatus 
            ? 'El local ahora está cerrado. Los clientes solo pueden realizar pre-órdenes.' 
            : 'El local está abierto y operando normalmente.'
        );
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (error) {
      showAlert('Error', 'No se pudo cambiar el estado del negocio.');
    } finally {
      setIsSaving(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.xl, alignItems: 'center', backgroundColor: colors.primary,
      borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...shadows.medium, marginBottom: spacing.lg,
    },
    backBtn: { position: 'absolute', top: spacing.xl, left: spacing.md, zIndex: 10, padding: 10 },
    avatarContainer: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF',
      justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, ...shadows.small,
    },
    avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
    userName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: '#FFFFFF' },
    userEmail: { fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)' },
    section: { paddingHorizontal: spacing.md, marginBottom: spacing.xl },
    sectionTitle: {
      fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.primary,
      textTransform: 'uppercase', marginBottom: spacing.md, marginLeft: spacing.xs,
    },
    menuItem: {
      flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface,
      borderRadius: borders.radius.lg, marginBottom: spacing.sm, ...shadows.small,
    },
    iconContainer: {
      width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '15',
      justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
    },
    menuText: { flex: 1, fontSize: typography.sizes.md, color: colors.text.primary, fontWeight: typography.weights.medium },
    themeSelector: {
      flexDirection: 'row', backgroundColor: darkMode ? '#2C2C2E' : '#E9E9EB', padding: 3,
      borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border,
    },
    themeBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: borders.radius.sm + 2 },
    themeBtnActive: { backgroundColor: colors.primary, ...shadows.small },
    logoutButton: {
      margin: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      padding: spacing.md, borderRadius: borders.radius.lg, backgroundColor: colors.error + '15',
      borderWidth: 1, borderColor: colors.error + '30',
    },
    logoutText: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.error, marginLeft: spacing.sm },
    footerText: { textAlign: 'center', color: colors.text.secondary, fontSize: 10, marginBottom: spacing.xl },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
    modalContent: { backgroundColor: colors.background, borderRadius: borders.radius.lg, padding: spacing.xl, ...shadows.large },
    modalTitle: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.lg, textAlign: 'center' },
    rateInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    rateCurrency: { fontSize: typography.sizes.md, fontWeight: 'bold', color: colors.primary, width: 60 },
    rateInput: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borders.radius.md, color: colors.text.primary, borderWidth: 1, borderColor: colors.border, minHeight: 50, width: '100%' },
    modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
    modalBtn: { flex: 1, padding: spacing.md, borderRadius: borders.radius.md, alignItems: 'center' },
    modalBtnCancel: { backgroundColor: colors.surface, marginRight: spacing.sm },
    modalBtnSave: { backgroundColor: colors.primary, marginLeft: spacing.sm }
  }), [colors, darkMode]);

  const handleLogout = () => {
    showAlert('Cerrar Sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => {
        try { await signOut(); } catch (error) { showAlert('Error', 'No se pudo cerrar la sesión'); }
      }}
    ]);
  };

  const SettingItem = ({ icon, title, onPress, isSwitch, value }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={isSwitch} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <FontAwesome5 name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.menuText}>{title}</Text>
      {isSwitch ? (
        <Switch value={value} onValueChange={onPress} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="white" />
      ) : (
        <FontAwesome5 name="chevron-right" size={12} color={colors.text.secondary} />
      )}
    </TouchableOpacity>
  );

  const FCMKeyConfigItem = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [keyValue, setKeyValue] = useState('');
    const [configurado, setConfigurado] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      (async () => {
        try {
          const res = await fetch(CONFIG.GAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'GET_PROPERTY', key: 'FCM_SERVICE_ACCOUNT' }),
          });
          const data = await res.json();
          setConfigurado(data?.value ? '✅' : '❌ Sin configurar');
        } catch { setConfigurado('⚠️ Sin conexión'); }
      })();
    }, []);

    const handleSave = async () => {
      setLoading(true);
      try {
        // Validate that it's valid JSON
        JSON.parse(keyValue);
        await fetch(CONFIG.GAS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'SET_PROPERTY', key: 'FCM_SERVICE_ACCOUNT', value: keyValue }),
        });
        setConfigurado('✅');
        setModalVisible(false);
        setKeyValue('');
      } catch (e) {
        showAlert('Error', e.message.includes('JSON') ? 'El JSON no es válido. Copia el archivo completo.' : 'No se pudo guardar: ' + e.message);
      } finally { setLoading(false); }
    };

    return (
      <>
        <TouchableOpacity style={styles.menuItem} onPress={() => setModalVisible(true)}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <FontAwesome5 name="key" size={14} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuText, { fontSize: 13 }]}>Firebase Service Account</Text>
            <Text style={{ fontSize: 10, color: colors.text.secondary, marginTop: 2 }}>
              {configurado || 'Verificando...'}
            </Text>
          </View>
        </TouchableOpacity>
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Firebase Service Account</Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 12 }}>
                Pega aquí el JSON completo de la cuenta de servicio (Firebase Console → Project Settings → Service Accounts → Generate new private key).
              </Text>
              <TextInput
                style={[styles.rateInput, { minHeight: 160, textAlignVertical: 'top' }]}
                placeholder='{\n  "type": "service_account",\n  "project_id": "dsicario-...",\n  ...\n}'
                placeholderTextColor={colors.text.secondary}
                value={keyValue}
                onChangeText={setKeyValue}
                multiline
                autoCapitalize="none"
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => { setModalVisible(false); setKeyValue(''); }}>
                  <Text style={{ color: colors.text.primary }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSave} disabled={loading || !keyValue}>
                  <Text style={{ color: '#fff' }}>{loading ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            {isAdmin && businessInfo?.logo ? (
              <TextInput style={{ display: 'none' }} /> // Hack to avoid potential issues with empty views
            ) : null}
            <Text style={styles.avatarText}>
              {isAdmin ? (businessInfo?.name || 'D')[0].toUpperCase() : (user?.displayName || user?.email || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{isAdmin ? (businessInfo?.name || 'Local DSicario') : (username || 'Usuario DSicario')}</Text>
          <Text style={styles.userEmail}>{isAdmin ? (businessInfo?.email || 'admin@dsicario.com') : (userTypeId ? `Código: ${userTypeId}` : (user?.email || 'cliente@dsicario.com'))}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isAdmin ? 'Perfil del Local' : 'Mi Cuenta'}</Text>
          <SettingItem 
            icon={isAdmin ? "store" : "user-edit"} 
            title={isAdmin ? "Información del Local" : "Datos Personales"} 
            onPress={() => navigation.navigate('ConfigPersonalData')} 
          />
          <SettingItem 
            icon={isUserSyncing ? "spinner" : "sync"} 
            title={isUserSyncing ? "Sincronizando..." : "Sincronizar Perfil"} 
            onPress={handleSyncProfile} 
          />
          <SettingItem icon="history" title="Historial de Pedidos" onPress={() => navigation.navigate('PurchaseHistory')} />
          <SettingItem icon="heart" title="Mis Favoritos" onPress={() => navigation.navigate('Favorites')} />
        </View>

          {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ ADMINISTRACIÓN</Text>
            <SettingItem icon="users-cog" title="Gestión de Personal" onPress={() => navigation.navigate('AdminStaff')} />
            <SettingItem icon="motorcycle" title="Administrar Repartidores" onPress={() => navigation.navigate('AdminDeliveryScreen')} />
            <SettingItem icon="shipping-fast" title="Costos de Envío" onPress={() => navigation.navigate('ConfigDeliveryRates')} />
            <SettingItem icon="money-bill-wave" title="Tasas de Cambio" onPress={() => navigation.navigate('ConfigExchangeRates')} />
            <SettingItem icon="credit-card" title="Métodos de Pago" onPress={() => navigation.navigate('ConfigPaymentMethods')} />
            <FCMKeyConfigItem />
          </View>
        )}

        {/* SECCIÓN DE STAFF: ABRIR/CERRAR NEGOCIO */}
        {role && role.toLowerCase() !== 'cliente' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏬 GESTIÓN DE NEGOCIO</Text>
            <SettingItem 
              icon="user-shield" 
              title="Modo Gestión Empleado" 
              onPress={() => navigation.navigate('StaffModeSettings')} 
            />
            <SettingItem 
              icon="store" 
              title={businessInfo?.closed ? "Estado: CERRADO" : "Estado: ABIERTO"} 
              isSwitch 
              value={!businessInfo?.closed} 
              onPress={async (newValue) => {
                setIsSaving(true);
                try {
                  // Aseguramos que el nombre coincida exactamente con el de la DB para el UPSERT
                  const updatedInfo = { 
                    ...businessInfo, 
                    closed: !newValue // Si newValue es true (abierto), closed es false.
                  };
                  
                  const res = await saveBusinessInfo(updatedInfo);
                  if (res && res.success) {
                    updateBusinessInfo(updatedInfo);
                    showAlert(
                      !updatedInfo.closed ? '☀️ Negocio Abierto' : '🌙 Modo Pre-orden',
                      !updatedInfo.closed 
                        ? 'El local está abierto y operando normalmente.' 
                        : 'El local ahora está cerrado. Los clientes solo pueden realizar pre-órdenes.'
                    );
                  } else {
                    throw new Error(res?.message || 'Error en servidor');
                  }
                } catch (e) {
                  console.error('Error toggling status:', e);
                  showAlert('Error', 'No se pudo actualizar el estado en la nube.');
                } finally {
                  setIsSaving(false);
                }
              }} 
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ajustes de App</Text>
          <View style={styles.menuItem}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name={darkMode ? "moon" : "sun"} size={16} color={colors.primary} />
            </View>
            <Text style={styles.menuText}>Tema Visual</Text>
            <View style={styles.themeSelector}>
              <TouchableOpacity onPress={() => setThemeMode('light')} style={[styles.themeBtn, themeMode === 'light' && styles.themeBtnActive]}>
                <FontAwesome5 name="sun" size={12} color={themeMode === 'light' ? 'white' : colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setThemeMode('dark')} style={[styles.themeBtn, themeMode === 'dark' && styles.themeBtnActive]}>
                <FontAwesome5 name="moon" size={12} color={themeMode === 'dark' ? 'white' : colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>
          <SettingItem 
            icon="bell" 
            title="Notificaciones" 
            isSwitch 
            value={notifications} 
            onPress={async () => {
              if (Platform.OS === 'web') {
                  if (!notifications) {
                  console.log('[ConfigNotif] Activando notificaciones web...');
                  const granted = await NotificationService.requestWebPermission();
                  if (granted) {
                    console.log('[ConfigNotif] Permiso concedido, enviando notificación de bienvenida');
                    setNotifications(true);
                    await NotificationService.sendLocalNotification(
                      '🔔 ¡Alertas Activadas!',
                      'Ahora recibirás notificaciones de tus pedidos en este navegador.'
                    );
                    console.log('[ConfigNotif] ✅ Alert mostrado: Éxito - Notificaciones habilitadas');
                    showAlert('Éxito', '¡Notificaciones del navegador habilitadas! Recibirás alertas en tiempo real.');
                  } else {
                    console.log('[ConfigNotif] ⚠️ Alert mostrado: Aviso - Permiso denegado');
                    showAlert(
                      'Aviso',
                      'No se pudieron habilitar las notificaciones. Para activarlas manualmente, haz clic en el candado de la barra de direcciones del navegador y cambia el permiso de notificaciones.'
                    );
                  }
                } else {
                  console.log('[ConfigNotif] Desactivando notificaciones web');
                  setNotifications(false);
                  console.log('[ConfigNotif] ℹ️ Alert mostrado: Notificaciones Desactivadas');
                  showAlert(
                    'Notificaciones Desactivadas',
                    'Las alertas locales han sido silenciadas en esta sesión. Para revocar el permiso permanentemente, ve a la configuración de tu navegador.'
                  );
                }
              } else {
                // Nativo: toggle simple
                setNotifications(!notifications);
              }
            }} 
          />
          {/* Botón de prueba de notificación */}
          <TouchableOpacity
            style={[styles.menuItem, { justifyContent: 'space-between' }]}
            onPress={async () => {
              console.log('[ConfigNotif] Botón Probar Notificación presionado');
              try {
                const sent = await NotificationService.sendLocalNotification(
                  '🔔 Notificación de Prueba',
                  '¡Funciona! Las notificaciones están activas y llegando correctamente.'
                );
                if (!sent && Platform.OS === 'web') {
                  console.log('[ConfigNotif] ⚠️ Alert mostrado: Sin permiso');
                  showAlert(
                    'Sin permiso',
                    'Activa las notificaciones con el switch de arriba primero.'
                  );
                }
              } catch (e) {
                console.log('[ConfigNotif] ❌ Alert mostrado: Error -', e.message);
                showAlert('Error', 'No se pudo enviar la notificación de prueba.');
              }
            }}
          >
            <View style={styles.iconContainer}>
              <FontAwesome5 name="paper-plane" size={16} color={colors.primary} />
            </View>
            <Text style={styles.menuText}>Probar Notificación</Text>
            <FontAwesome5 name="chevron-right" size={12} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Token FCM debug */}
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface + '80', paddingVertical: 8 }]} onPress={async () => {
            try {
              setFcmToken('Obteniendo...');
              const token = await getFCMToken();
              setFcmToken(token || null);
              if (!token && typeof window !== 'undefined' && window.__FCM_TOKEN_ERROR__) {
                setFcmToken(null);
                showAlert('Error FCM', window.__FCM_TOKEN_ERROR__);
              }
            } catch { setFcmToken(null); }
          }}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name="fingerprint" size={14} color={colors.text.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { fontSize: 11 }]}>Token FCM (Firebase)</Text>
              <Text style={{ fontSize: 9, color: colors.text.secondary, marginTop: 2 }} numberOfLines={2} selectable>
                {fcmToken === 'Obteniendo...' 
                  ? 'Cargando Firebase...'
                  : fcmToken 
                    ? fcmToken 
                    : typeof window !== 'undefined' && window.__FCM_TOKEN_ERROR__
                      ? window.__FCM_TOKEN_ERROR__
                      : 'Toca para obtener token FCM'}
              </Text>
            </View>
          </TouchableOpacity>
          {/* Expo Push Token debug */}
          <View style={[styles.menuItem, { backgroundColor: colors.surface + '30', paddingVertical: 8 }]}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name="bell" size={14} color={colors.text.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { fontSize: 11 }]}>Token Expo Push</Text>
              <Text style={{ fontSize: 9, color: colors.text.secondary, marginTop: 2 }} numberOfLines={1} selectable>
                {typeof window !== 'undefined' && window.__PUSH_TOKEN__ 
                  ? window.__PUSH_TOKEN__ 
                  : 'No disponible en localhost (CORS)'}
              </Text>
            </View>
          </View>

          {Platform.OS === 'web' && (
            <SettingItem
              icon="bug"
              title="Control de Logs"
              onPress={() => setLoggerModalVisible(true)}
            />
          )}
          <LoggerModal visible={loggerModalVisible} onClose={() => setLoggerModalVisible(false)} />
          <SettingItem 
            icon={isCheckingUpdates ? "spinner" : "download"} 
            title={isCheckingUpdates ? "Buscando..." : "Buscar Actualizaciones"} 
            onPress={handleCheckUpdates} 
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome5 name="power-off" size={16} color={colors.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          DSicarioApp v{Constants.expoConfig?.version || '1.0.0'} • Hecho con amor 🇩🇴
        </Text>
      </ScrollView>


    </SafeAreaView>
  );
};

export default ConfigScreen;
