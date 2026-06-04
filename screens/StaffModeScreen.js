import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  StatusBar,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { useCart } from '../contexts/AppContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, shadows } from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const StaffModeScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { role, email, username, isClientMode, setIsClientMode } = useUser();
  const { activeStaffMode, setActiveStaffMode } = useCart();

  const roleLow = role ? role.toLowerCase() : '';
  const isAdmin = roleLow.includes('admin') || roleLow === 'owner';
  const isDelivery = roleLow.includes('delivery') || roleLow.includes('repartidor');
  const isCocina = roleLow.includes('cocina') || roleLow.includes('cosina');
  const isMesero = roleLow.includes('mesero');
  
  const isOwner = email?.toLowerCase()?.trim() === 'hairoman28@gmail.com';
  const isStaff = isCocina || isDelivery || isMesero || isAdmin || isOwner;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: spacing.xl + 10,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      ...shadows.large,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    headerTitle: { 
      fontSize: 24, 
      fontWeight: '900', 
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    headerSub: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      marginTop: 2,
    },
    content: { 
      padding: spacing.lg,
      marginTop: -20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...shadows.medium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: spacing.md,
      marginLeft: spacing.xs,
    },
    modeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: 22,
      marginBottom: spacing.md,
      ...shadows.small,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    modeText: { flex: 1 },
    modeTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    modeDesc: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    clientBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: 24,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.primary + '40',
      ...shadows.medium,
    },
    adminShortcut: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginBottom: spacing.md,
      borderLeftWidth: 5,
      ...shadows.small,
    },
    shortcutIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    }
  }), [colors, shadows]);

  const staffModes = [
    {
      id: 'cocina',
      label: 'Monitor de Cocina',
      sub: 'Gestión de órdenes en tiempo real',
      icon: 'pot-steam',
      color: '#FF6B6B',
      visible: isStaff,
      screen: 'CocinaAdmin'
    },
    {
      id: 'mesero',
      label: 'Modo Mesero',
      sub: 'Toma de pedidos en mesa',
      icon: 'room-service',
      color: '#4ECDC4',
      visible: isStaff,
      screen: 'WaiterHome'
    },
    {
      id: 'repartidor',
      label: 'Vista de Repartidor',
      sub: 'Entregas y rutas de delivery',
      icon: 'motorbike',
      color: '#45B7D1',
      visible: isStaff,
      screen: 'RiderView'
    }
  ];

  if (!isStaff) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[colors.primary, colors.primary + 'DD']} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <FontAwesome5 name="arrow-left" size={18} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Acceso Restringido</Text>
          </View>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <View style={[styles.iconBox, { backgroundColor: colors.error + '20', width: 80, height: 80, borderRadius: 40, marginBottom: 20 }]}>
            <FontAwesome5 name="lock" size={30} color={colors.error} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary, textAlign: 'center' }}>
            Personal Autorizado Solamente
          </Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginTop: 10 }}>
            Tu cuenta actual ({role}) no tiene permisos para acceder al panel de gestión.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient 
        colors={[colors.primary, '#2C3E50']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <FontAwesome5 name="chevron-left" size={16} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Panel de Gestión</Text>
            <Text style={styles.headerSub}>{username} • {role}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* MODO CLIENTE TOGGLE */}
        <LinearGradient
          colors={isClientMode ? [colors.primary + '15', colors.primary + '05'] : [colors.surface, colors.surface]}
          style={styles.clientBanner}
        >
          <View style={[styles.iconBox, { backgroundColor: isClientMode ? colors.primary : colors.border }]}>
            <MaterialCommunityIcons name="account-eye" size={24} color="#FFF" />
          </View>
          <View style={styles.modeText}>
            <Text style={[styles.modeTitle, isClientMode && { color: colors.primary }]}>
              {isClientMode ? 'Modo Cliente Activo' : 'Perfil de Trabajo'}
            </Text>
            <Text style={styles.modeDesc}>
              {isClientMode ? 'Estás viendo la app como un usuario' : 'Las herramientas de personal están activas'}
            </Text>
          </View>
          <Switch
            value={isClientMode}
            onValueChange={setIsClientMode}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={isClientMode ? colors.primary : '#f4f3f4'}
          />
        </LinearGradient>

        {!isClientMode && (
          <>
            <Text style={styles.sectionLabel}>Módulos Operativos</Text>
            {staffModes.map((mode) => (
              <TouchableOpacity 
                key={mode.id} 
                activeOpacity={0.8}
                onPress={() => {
                  setActiveStaffMode(mode.id);
                  navigation.navigate('MainTabs', { screen: mode.screen });
                }}
              >
                <View style={[
                  styles.modeCard, 
                  activeStaffMode === mode.id && { borderColor: mode.color, borderWidth: 2, backgroundColor: mode.color + '05' }
                ]}>
                  <View style={[styles.iconBox, { backgroundColor: mode.color }]}>
                    <MaterialCommunityIcons name={mode.icon} size={26} color="#FFF" />
                  </View>
                  <View style={styles.modeText}>
                    <Text style={[styles.modeTitle, activeStaffMode === mode.id && { color: mode.color }]}>{mode.label}</Text>
                    <Text style={styles.modeDesc}>{mode.sub}</Text>
                  </View>
                  <View style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: 12, 
                    borderWidth: 2, 
                    borderColor: activeStaffMode === mode.id ? mode.color : colors.border,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {activeStaffMode === mode.id && (
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: mode.color }} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {isAdmin && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Administración del Sistema</Text>
                
                {/* Gestión de Usuarios */}
                <TouchableOpacity 
                  style={[styles.adminShortcut, { borderLeftColor: '#16A085' }]}
                  onPress={() => navigation.navigate('AdminUsers')}
                >
                  <View style={[styles.shortcutIcon, { backgroundColor: '#16A085' + '15' }]}>
                    <FontAwesome5 name="users" size={18} color="#16A085" />
                  </View>
                  <View style={styles.modeText}>
                    <Text style={styles.modeTitle}>Gestión de Usuarios</Text>
                    <Text style={styles.modeDesc}>Cuentas, perfiles y datos de clientes</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={14} color={colors.text.light} />
                </TouchableOpacity>

                {/* Gestión de Staff */}
                <TouchableOpacity 
                  style={[styles.adminShortcut, { borderLeftColor: '#8E44AD' }]}
                  onPress={() => navigation.navigate('AdminStaff')}
                >
                  <View style={[styles.shortcutIcon, { backgroundColor: '#8E44AD' + '15' }]}>
                    <FontAwesome5 name="user-shield" size={18} color="#8E44AD" />
                  </View>
                  <View style={styles.modeText}>
                    <Text style={styles.modeTitle}>Roles y Permisos</Text>
                    <Text style={styles.modeDesc}>Configura quién accede a qué módulos</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={14} color={colors.text.light} />
                </TouchableOpacity>

                {/* Gestión de Repartidores */}
                <TouchableOpacity 
                  style={[styles.adminShortcut, { borderLeftColor: '#2980B9' }]}
                  onPress={() => navigation.navigate('AdminDeliveryScreen')}
                >
                  <View style={[styles.shortcutIcon, { backgroundColor: '#2980B9' + '15' }]}>
                    <FontAwesome5 name="motorcycle" size={18} color="#2980B9" />
                  </View>
                  <View style={styles.modeText}>
                    <Text style={styles.modeTitle}>Gestión de Repartidores</Text>
                    <Text style={styles.modeDesc}>Comisiones, deudas y asignación</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={14} color={colors.text.light} />
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default StaffModeScreen;
