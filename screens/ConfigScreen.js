import { showAlert } from '../utils/showAlert';
import React, { useState, useMemo } from 'react';
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

const ConfigScreen = () => {
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
  // Inicializar estado de notificaciones según el permiso actual del browser
  const getInitialNotifState = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission === 'granted';
    }
    return true;
  };
  const [notifications, setNotifications] = useState(getInitialNotifState);
  const { exchangeRates, updateExchangeRates, businessInfo, updateBusinessInfo } = useCart();
  const [ratesModalVisible, setRatesModalVisible] = useState(false);
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [personalDataModalVisible, setPersonalDataModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempRates, setTempRates] = useState({});
  const [tempDelivery, setTempDelivery] = useState({
    baseFee: '100',
    expressFee: '50'
  });
  const PREDEFINED_METHODS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Binance', 'PayPal', 'Zelle'];
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [tempTransfer, setTempTransfer] = useState({ Banco: '', No_Cuenta: '', Titular: '' });
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [tempPaymentMethods, setTempPaymentMethods] = useState([]);
  const [tempPaymentNotes, setTempPaymentNotes] = useState({});
  const [tempPaymentNote, setTempPaymentNote] = useState('');
  const [customMethod, setCustomMethod] = useState('');
  const [tempUser, setTempUser] = useState({
    nombre: username,
    direccion: address,
    telefono: phone
  });
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const openDeliveryModal = () => {
    setTempDelivery({
      baseFee: String(businessInfo?.deliveryBaseFee || 100),
      expressFee: String(businessInfo?.expressFee || 50)
    });
    setDeliveryModalVisible(true);
  };

  const saveDeliverySettings = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...businessInfo,
        deliveryBaseFee: parseFloat(tempDelivery.baseFee) || 0,
        expressFee: parseFloat(tempDelivery.expressFee) || 0
      };

      const result = await saveBusinessInfo(payload);
      if (result && result.success) {
        updateBusinessInfo(payload); // Actualizar globalmente
        showAlert('Éxito', 'Configuración de envíos actualizada.');
        setDeliveryModalVisible(false);
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (error) {
      showAlert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  const openRatesModal = () => {
    setTempRates(exchangeRates || { USD: 58.00, EUR: 63.00, COP: 0.015, MXN: 3.50 });
    setRatesModalVisible(true);
  };

  const saveRates = () => {
    updateExchangeRates(tempRates);
    setRatesModalVisible(false);
    showAlert('Éxito', 'Tasas de cambio actualizadas correctamente.');
  };

  const openPaymentModal = () => {
    setTempPaymentMethods(businessInfo?.paymentMethods || ['Efectivo', 'Tarjeta']);
    setTempPaymentNotes(businessInfo?.paymentNotes || {});
    setTempPaymentNote(businessInfo?.generalPaymentNote || '');
    setCustomMethod('');
    setPaymentModalVisible(true);
  };

  const togglePaymentMethod = (method) => {
    if (tempPaymentMethods.includes(method)) {
      setTempPaymentMethods(tempPaymentMethods.filter(m => m !== method));
    } else {
      setTempPaymentMethods([...tempPaymentMethods, method]);
    }
  };

  const addCustomPaymentMethod = () => {
    const trimmed = customMethod.trim();
    if (trimmed && !tempPaymentMethods.includes(trimmed)) {
      setTempPaymentMethods([...tempPaymentMethods, trimmed]);
      setCustomMethod('');
    }
  };

  const savePaymentMethodsConfig = async () => {
    setIsSaving(true);
    try {
      if (tempPaymentMethods.length === 0) {
        showAlert('Error', 'Debes incluir al menos un método de pago (ej. Efectivo)');
        setIsSaving(false);
        return;
      }
      
      const payload = {
        ...businessInfo,
        paymentMethods: tempPaymentMethods,
        paymentNotes: tempPaymentNotes,
        generalPaymentNote: tempPaymentNote
      };

      const result = await saveBusinessInfo(payload);
      if (result && result.success) {
        // Guardar cada método en la hoja Metodos_pagos para sincronizar Tipo Entrega
        for (const method of tempPaymentMethods) {
          const detailed = businessInfo.paymentMethodsDetailed?.find(m => m['Metodo Pago'] === method);
          await savePaymentMethod({
            'Metodo Pago': method,
            'Tipo Entrega': detailed ? detailed['Tipo Entrega'] : 'ambos'
          });
        }
        
        updateBusinessInfo(payload);
        showAlert('Éxito', 'Métodos de pago actualizados.');
        setPaymentModalVisible(false);
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (error) {
      showAlert('Error', 'No se pudieron guardar los métodos de pago.');
    } finally {
      setIsSaving(false);
    }
  };

  const openPersonalDataModal = () => {
    if (isAdmin && businessInfo) {
      setTempUser({
        nombre: businessInfo.name || '',
        direccion: businessInfo.address || '',
        telefono: businessInfo.phone || ''
      });
    } else {
      setTempUser({
        nombre: username,
        direccion: address,
        telefono: phone
      });
    }
    setPersonalDataModalVisible(true);
  };

  const savePersonalData = async () => {
    if (!tempUser.nombre.trim()) {
      showAlert('Error', isAdmin ? 'El nombre del local es obligatorio' : 'El nombre es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      if (isAdmin) {
        const payload = {
          ...businessInfo,
          name: tempUser.nombre,
          address: tempUser.direccion,
          phone: tempUser.telefono
        };

        const result = await saveBusinessInfo(payload);
        if (result && result.success) {
          updateBusinessInfo(payload);
          setPersonalDataModalVisible(false);
          showAlert('Éxito', 'Información del local actualizada correctamente.');
        } else {
          throw new Error('Error al guardar en el servidor');
        }
      } else {
        const payload = {
          id: user?.uid,
          username: tempUser.nombre,
          email: user?.email,
          direccion: tempUser.direccion,
          telefono: tempUser.telefono,
          role: role
        };

        const result = await saveUser(payload);
        
        if (result && result.success) {
          setUsername(tempUser.nombre);
          setAddress(tempUser.direccion);
          setPhone(tempUser.telefono);
          setPersonalDataModalVisible(false);
          showAlert('Éxito', 'Datos actualizados correctamente.');
        } else {
          throw new Error('No se pudo guardar en el servidor');
        }
      }
    } catch (error) {
      console.error('Error saving data:', error);
      showAlert('Error', 'Hubo un problema al guardar los datos. Intente de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncProfile = async () => {
    if (!user?.email) return;
    try {
      await syncUserRole(user.email);
      showAlert('Sincronización', 'Tus datos han sido actualizados desde el servidor.');
    } catch (error) {
      showAlert('Error', 'No se pudieron sincronizar los datos.');
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
            onPress={openPersonalDataModal} 
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
            <SettingItem icon="shipping-fast" title="Costos de Envío" onPress={openDeliveryModal} />
            <SettingItem icon="money-bill-wave" title="Tasas de Cambio" onPress={openRatesModal} />
            <SettingItem icon="credit-card" title="Métodos de Pago" onPress={openPaymentModal} />
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
                  // El usuario quiere ACTIVAR: solicitar permiso bajo un gesto real de usuario
                  const granted = await NotificationService.requestWebPermission();
                  if (granted) {
                    setNotifications(true);
                    await NotificationService.sendLocalNotification(
                      '🔔 ¡Alertas Activadas!',
                      'Ahora recibirás notificaciones de tus pedidos en este navegador.'
                    );
                    showAlert('Éxito', '¡Notificaciones del navegador habilitadas! Recibirás alertas en tiempo real.');
                  } else {
                    showAlert(
                      'Aviso',
                      'No se pudieron habilitar las notificaciones. Para activarlas manualmente, haz clic en el candado de la barra de direcciones del navegador y cambia el permiso de notificaciones.'
                    );
                  }
                } else {
                  // El usuario quiere DESACTIVAR: informar que debe hacerlo manualmente
                  setNotifications(false);
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
              try {
                const sent = await NotificationService.sendLocalNotification(
                  '🔔 Notificación de Prueba',
                  '¡Funciona! Las notificaciones están activas y llegando correctamente.'
                );
                if (!sent && Platform.OS === 'web') {
                  showAlert(
                    'Sin permiso',
                    'Activa las notificaciones con el switch de arriba primero.'
                  );
                }
              } catch (e) {
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
          {isAdmin && (
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setTempTransfer({ Banco: '', No_Cuenta: '', Titular: '' });
              setIsEditingBank(false);
              setTransferModalVisible(true);
            }}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="university" size={16} color={colors.primary} />
              </View>
              <Text style={styles.menuText}>Configurar Bancos</Text>
              <FontAwesome5 name="chevron-right" size={12} color={colors.text.light} />
            </TouchableOpacity>
          )}
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

      {/* MODAL DE TASAS DE CAMBIO */}
      <Modal visible={ratesModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajustar Tasas de Cambio</Text>
            <Text style={{ color: colors.text.secondary, marginBottom: 15, fontSize: 12, textAlign: 'center' }}>
              Valor en pesos (DOP) de cada moneda extranjera.
            </Text>
            
            {Object.keys(tempRates).map(curr => (
              <View key={curr} style={styles.rateInputRow}>
                <Text style={styles.rateCurrency}>{curr}</Text>
                <TextInput
                  style={[styles.rateInput, { flex: 1 }]}
                  keyboardType="numeric"
                  placeholderTextColor={colors.text.light}
                  value={String(tempRates[curr])}
                  onChangeText={(val) => {
                    const parsed = parseFloat(val.replace(',', '.')) || 0;
                    setTempRates(prev => ({ ...prev, [curr]: parsed || val }));
                  }}
                  onEndEditing={() => {
                    setTempRates(prev => ({ ...prev, [curr]: parseFloat(prev[curr]) || 0 }));
                  }}
                />
              </View>
            ))}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setRatesModalVisible(false)}>
                <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={saveRates}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  
      {/* MODAL DE DATOS PERSONALES / LOCAL */}
      <Modal visible={personalDataModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isAdmin ? 'Editar Datos del Local' : 'Editar Datos Personales'}</Text>
            
            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>{isAdmin ? 'Nombre del Negocio' : 'Nombre Completo'}</Text>
              <TextInput
                style={styles.rateInput}
                value={tempUser.nombre}
                onChangeText={(text) => setTempUser(prev => ({ ...prev, nombre: text }))}
                placeholder={isAdmin ? "Nombre del Local" : "Tu nombre"}
                placeholderTextColor={colors.text.light}
              />
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Teléfono</Text>
              <TextInput
                style={styles.rateInput}
                value={String(tempUser.telefono || '')}
                onChangeText={(text) => setTempUser(prev => ({ ...prev, telefono: text }))}
                placeholder="809-000-0000"
                placeholderTextColor={colors.text.light}
                keyboardType="phone-pad"
              />
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>{isAdmin ? 'Dirección del Local' : 'Dirección de Envío'}</Text>
              <TextInput
                style={[styles.rateInput, { height: 80, textAlignVertical: 'top' }]}
                value={tempUser.direccion}
                onChangeText={(text) => setTempUser(prev => ({ ...prev, direccion: text }))}
                placeholder={isAdmin ? "Dirección física..." : "Calle, Número, Sector..."}
                placeholderTextColor={colors.text.light}
                multiline
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setPersonalDataModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSave, { opacity: isSaving ? 0.7 : 1 }]} 
                onPress={savePersonalData}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIGURACIÓN DE ENVÍOS */}
      <Modal visible={deliveryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Envíos</Text>
            
            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Tarifa Base de Envío (RD$)</Text>
              <TextInput
                style={styles.rateInput}
                keyboardType="numeric"
                value={tempDelivery.baseFee}
                onChangeText={(val) => setTempDelivery(prev => ({ ...prev, baseFee: val }))}
                placeholder="Ej: 100"
                placeholderTextColor={colors.text.light}
              />
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Tarifa Express Adicional (RD$)</Text>
              <TextInput
                style={styles.rateInput}
                keyboardType="numeric"
                value={tempDelivery.expressFee}
                onChangeText={(val) => setTempDelivery(prev => ({ ...prev, expressFee: val }))}
                placeholder="Ej: 50"
                placeholderTextColor={colors.text.light}
              />
              <Text style={{ color: colors.text.light, fontSize: 11, marginTop: 5 }}>
                Este monto se suma a la tarifa base cuando el cliente elige "Envío Express".
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setDeliveryModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSave]} 
                onPress={saveDeliverySettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE MÉTODOS DE PAGO */}
      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Métodos de Pago</Text>
            <Text style={{ color: colors.text.secondary, marginBottom: 15, fontSize: 12, textAlign: 'center' }}>
              Activa los métodos de pago que deseas aceptar. También puedes añadir nuevos.
            </Text>
            
            <ScrollView style={{ maxHeight: 300, marginBottom: spacing.md }} showsVerticalScrollIndicator={false}>
              {Array.from(new Set([...PREDEFINED_METHODS, ...tempPaymentMethods])).map(method => {
                const isEnabled = tempPaymentMethods.includes(method);
                return (
                  <View key={method} style={{ marginBottom: 15, paddingHorizontal: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text.primary, fontSize: 16 }}>{method}</Text>
                      <Switch 
                        value={isEnabled} 
                        onValueChange={() => togglePaymentMethod(method)}
                        trackColor={{ false: colors.border, true: colors.primary }} 
                        thumbColor="white" 
                      />
                    </View>
                    {isEnabled && (
                      <View style={{ marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.primary + '30' }}>
                        <Text style={{ color: colors.text.secondary, fontSize: 11, marginBottom: 5 }}>Disponible para:</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          {['delivery', 'local', 'ambos'].map(type => {
                            const detailed = businessInfo.paymentMethodsDetailed?.find(m => m['Metodo Pago'] === method);
                            const currentType = detailed ? (detailed['Tipo Entrega'] || 'ambos').toLowerCase() : 'ambos';
                            const isTypeActive = type === 'ambos' ? (currentType !== 'delivery' && currentType !== 'local') : currentType.includes(type);
                            
                            return (
                              <TouchableOpacity 
                                key={type}
                                onPress={async () => {
                                  const updatedDetailed = (businessInfo.paymentMethodsDetailed || []).map(m => 
                                    m['Metodo Pago'] === method ? { ...m, 'Tipo Entrega': type } : m
                                  );
                                  if (!updatedDetailed.find(m => m['Metodo Pago'] === method)) {
                                    updatedDetailed.push({ 'Metodo Pago': method, 'Tipo Entrega': type });
                                  }
                                  updateBusinessInfo({ ...businessInfo, paymentMethodsDetailed: updatedDetailed });
                                }}
                                style={{ 
                                  paddingHorizontal: 10, 
                                  paddingVertical: 5, 
                                  borderRadius: 15, 
                                  backgroundColor: isTypeActive ? colors.primary : colors.background,
                                  borderWidth: 1,
                                  borderColor: isTypeActive ? colors.primary : colors.border
                                }}
                              >
                                <Text style={{ fontSize: 10, color: isTypeActive ? 'white' : colors.text.secondary, fontWeight: 'bold' }}>
                                  {type.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <TextInput
                          style={[styles.rateInput, { marginTop: 8, height: 40, minHeight: 40, padding: 10, fontSize: 12 }]}
                          value={tempPaymentNotes[method] || ''}
                          onChangeText={(text) => setTempPaymentNotes(prev => ({ ...prev, [method]: text }))}
                          placeholder="Instrucción corta (opcional)"
                          placeholderTextColor={colors.text.light}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.text.secondary, fontSize: 13, marginBottom: 8, fontWeight: 'bold' }}>
                Nota / Instrucción General (Opcional):
              </Text>
              <TextInput
                style={[styles.rateInput, { height: 60, padding: 10, fontSize: 13, textAlignVertical: 'top' }]}
                value={tempPaymentNote}
                onChangeText={setTempPaymentNote}
                placeholder="Ej. Cta BHD 123456 a nombre de Juan. O 'Por temas de seguridad no aceptamos tarjetas.'"
                placeholderTextColor={colors.text.light}
                multiline
              />
            </View>

            <View style={{ flexDirection: 'row', marginBottom: spacing.md, alignItems: 'center' }}>
              <TextInput
                style={[styles.rateInput, { flex: 1, minHeight: 40, height: 40, padding: 10, marginRight: 10 }]}
                value={customMethod}
                onChangeText={setCustomMethod}
                placeholder="Añadir otro (ej. Zelle)"
                placeholderTextColor={colors.text.light}
              />
              <TouchableOpacity 
                onPress={addCustomPaymentMethod} 
                style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
              >
                <FontAwesome5 name="plus" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setPaymentModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSave]} 
                onPress={savePaymentMethodsConfig}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE TRANSFERENCIAS BANCARIAS */}
      <Modal visible={transferModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditingBank ? 'Editar Datos de Banco' : 'Cuentas Bancarias'}</Text>
            
            {!isEditingBank ? (
              <View>
                <ScrollView style={{ maxHeight: 300, marginBottom: spacing.md }} showsVerticalScrollIndicator={false}>
                  {(!businessInfo?.transferDetails || businessInfo.transferDetails.length === 0) && (
                    <Text style={{ textAlign: 'center', color: colors.text.light, marginVertical: 20 }}>No hay bancos registrados</Text>
                  )}
                  {businessInfo?.transferDetails?.map((bank, index) => (
                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderRadius: borders.radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 16 }}>{bank.Banco}</Text>
                        <Text style={{ color: colors.text.primary, fontSize: 13 }}>{bank.No_Cuenta || bank.Cuenta}</Text>
                        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{bank.Titular}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 15, paddingRight: 10 }}>
                        <TouchableOpacity onPress={() => { setTempTransfer(bank); setIsEditingBank(true); }}>
                          <FontAwesome5 name="edit" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          showAlert('Eliminar', `¿Seguro que deseas borrar la cuenta del ${bank.Banco}?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Borrar', style: 'destructive', onPress: async () => {
                                setIsSaving(true);
                                try {
                                  if (bank.Id_transf) {
                                    await deleteTransferDetail(bank.Id_transf);
                                  }
                                  const updated = businessInfo.transferDetails.filter(t => t !== bank);
                                  updateBusinessInfo({ ...businessInfo, transferDetails: updated });
                                  showAlert('Éxito', 'Cuenta borrada.');
                                } catch (e) {
                                  showAlert('Error', 'No se pudo borrar.');
                                } finally {
                                  setIsSaving(false);
                                }
                            }}
                          ]);
                        }}>
                          <FontAwesome5 name="trash" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnSave, { width: '100%', marginBottom: 15 }]} 
                  onPress={() => {
                    setTempTransfer({ Banco: '', No_Cuenta: '', Titular: '' });
                    setIsEditingBank(true);
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'center' }}>+ Añadir Banco</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnCancel, { width: '100%', marginHorizontal: 0 }]} 
                  onPress={() => setTransferModalVisible(false)}
                >
                  <Text style={{ color: colors.text.primary, fontWeight: 'bold', textAlign: 'center' }}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Nombre del Banco</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={tempTransfer.Banco}
                    onChangeText={(val) => setTempTransfer(prev => ({ ...prev, Banco: val }))}
                    placeholder="Ej: BanReservas"
                    placeholderTextColor={colors.text.light}
                  />
                </View>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Número de Cuenta</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={tempTransfer.No_Cuenta}
                    onChangeText={(val) => setTempTransfer(prev => ({ ...prev, No_Cuenta: val }))}
                    placeholder="000-0000000-0"
                    placeholderTextColor={colors.text.light}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Titular de la Cuenta</Text>
                  <TextInput
                    style={styles.rateInput}
                    value={tempTransfer.Titular}
                    onChangeText={(val) => setTempTransfer(prev => ({ ...prev, Titular: val }))}
                    placeholder="Nombre completo"
                    placeholderTextColor={colors.text.light}
                  />
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.modalBtnCancel]} 
                    onPress={() => setIsEditingBank(false)}
                    disabled={isSaving}
                  >
                    <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.modalBtnSave]} 
                    onPress={async () => {
                      setIsSaving(true);
                      try {
                        const res = await saveTransferDetail(tempTransfer);
                        if (res && res.success) {
                          const updated = businessInfo.transferDetails || [];
                          const idx = updated.findIndex(t => (t.Id_transf && t.Id_transf === tempTransfer.Id_transf) || (t.Banco === tempTransfer.Banco && !t.Id_transf));
                          if (idx >= 0) updated[idx] = { ...updated[idx], ...tempTransfer };
                          else updated.push(tempTransfer);
                          
                          updateBusinessInfo({ ...businessInfo, transferDetails: updated });
                          showAlert('Éxito', 'Datos bancarios guardados.');
                          setIsEditingBank(false);
                        }
                      } catch (e) {
                        showAlert('Error', 'No se pudo guardar.');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ConfigScreen;
