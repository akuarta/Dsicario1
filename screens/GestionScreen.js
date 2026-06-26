import { showAlert } from '../utils/showAlert';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCart } from '../contexts/AppContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { saveBusinessInfo } from '../utils/api';
import { CONFIG } from '../constants/Config';

const GestionScreen = () => {
  const navigation = useNavigation();
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { role } = useUser();
  const { businessInfo, updateBusinessInfo } = useCart();
  const [isSaving, setIsSaving] = useState(false);

  const roleLow = (role || '').toLowerCase();
  const isAdmin = roleLow === 'admin' || roleLow === 'owner';
  const isStaff = roleLow === 'admin' || roleLow === 'owner' || roleLow === 'cocina' || roleLow === 'delivery' || roleLow === 'mesero' || roleLow === 'staff' || roleLow === 'rider';

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
  }), [colors, darkMode]);

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
          <View style={styles.headerIcon}>
            <FontAwesome5 name="tools" size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Panel de Gestión</Text>
          <Text style={styles.headerSubtitle}>Control total del negocio</Text>
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ Administración</Text>
            <SettingItem icon="users-cog" title="Gestión de Usuarios" onPress={() => navigation.navigate('AdminStaff')} />
            <SettingItem icon="chart-bar" title="Rendimiento Cocineros" onPress={() => navigation.navigate('AdminKitchen')} />
            <SettingItem icon="chart-bar" title="Rendimiento Meseros" onPress={() => navigation.navigate('AdminWaiter')} />
            <SettingItem icon="motorcycle" title="Administrar Repartidores" onPress={() => navigation.navigate('AdminDeliveryScreen')} />
            <SettingItem icon="shipping-fast" title="Costos de Envío" onPress={() => navigation.navigate('ConfigDeliveryRates')} />
            <SettingItem icon="money-bill-wave" title="Tasas de Cambio" onPress={() => navigation.navigate('ConfigExchangeRates')} />
            <SettingItem icon="credit-card" title="Métodos de Pago" onPress={() => navigation.navigate('ConfigPaymentMethods')} />
          </View>
        )}

        {isStaff && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏬 Gestión de Negocio</Text>
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
                  const updatedInfo = { ...businessInfo, closed: !newValue };
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

      </ScrollView>
    </SafeAreaView>
  );
};

export default GestionScreen;
