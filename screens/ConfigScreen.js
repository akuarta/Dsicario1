import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';

const ConfigScreen = () => {
  const { darkMode, setThemeMode, themeMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { role } = useUser();
  const isAdmin = !!(role && role.toLowerCase() === 'admin');
  const [notifications, setNotifications] = useState(true);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.xl, alignItems: 'center', backgroundColor: colors.primary,
      borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...shadows.medium, marginBottom: spacing.lg,
    },
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
  });

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => {
        console.log('Botón cerrar sesión presionado');
        try { 
          await signOut(); 
          console.log('Sesión cerrada');
        } catch (error) {
          console.error('Error:', error);
          Alert.alert('Error', 'No se pudo cerrar la sesión');
        }
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
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ position: 'absolute', top: spacing.xl, left: spacing.md, zIndex: 10, padding: 10 }}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.displayName || 'Usuario DSicario'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'cliente@dsicario.com'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Cuenta</Text>
          <SettingItem icon="history" title="Historial de Pedidos" onPress={() => navigation.navigate('PurchaseHistory')} />
          <SettingItem icon="heart" title="Mis Favoritos" onPress={() => navigation.navigate('Favorites')} />
          <SettingItem icon="map-marker-alt" title="Mis Direcciones" onPress={() => Alert.alert('Próximamente', 'Disponible pronto')} />
        </View>

        {/* ADMIN MENU */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ ADMINISTRACIÓN</Text>
            <SettingItem icon="motorcycle" title="Administrar Repartidores" onPress={() => navigation.navigate('RiderAdmin')} />
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
          <SettingItem icon="bell" title="Notificaciones" isSwitch value={notifications} onPress={() => setNotifications(!notifications)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <SettingItem icon="question-circle" title="Ayuda Pedidos" onPress={() => Alert.alert('Ayuda', 'ventas@dsicario.com')} />
          <SettingItem icon="info-circle" title="Sobre DSicario" onPress={() => Alert.alert('DSicario', 'v1.0\nHecho con amor 🇩🇴')} />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome5 name="power-off" size={16} color={colors.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
        
        <Text style={{ textAlign: 'center', color: colors.text.secondary, fontSize: 10, marginBottom: spacing.xl }}>
          DSicarioApp v1.2.0 • Hecho con amor 🇩🇴
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfigScreen;
