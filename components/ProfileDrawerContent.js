import { showAlert } from '../utils/showAlert';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useCart } from '../contexts/AppContext';
import { CONFIG } from '../constants/Config';

const ProfileDrawerContent = (props) => {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { username, email, role, isClientMode, setIsClientMode, userId, userTypeId, firebaseUid } = useUser();
  const { clearCart, getTotalItems, activeStaffMode, setActiveStaffMode } = useCart();
  const totalItems = getTotalItems();
  
  const roleLow = role ? role.toLowerCase() : '';
  const isAdmin = roleLow.includes('admin') || roleLow === 'owner';
  const isDelivery = roleLow.includes('delivery') || roleLow.includes('repartidor');
  const isCocina = roleLow.includes('cocina') || roleLow.includes('cosina');
  const isMesero = roleLow.includes('mesero');
  
  const isOwner = email?.toLowerCase()?.trim() === CONFIG.OWNER_EMAIL?.toLowerCase()?.trim();
  // Temporalmente habilitamos el switch para más gente si algo falla
  const isStaff = isCocina || isDelivery || isMesero || isAdmin || isOwner;

  const handleClearCart = () => {
    if (totalItems === 0) {
      showAlert('Carrito vacío', 'No hay productos en el carrito');
      return;
    }
    showAlert(
      'Vaciar carrito',
      '¿Estás seguro de que quieres vaciar todo el carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: () => {
            clearCart();
            showAlert('Carrito vaciado', 'Se han removido todos los productos del carrito');
          }
        }
      ]
    );
  };

  const navigate = (screen) => {
    props.navigation.closeDrawer();
    setTimeout(() => {
      props.navigation.navigate('MainTabs', { screen });
    }, 350);
  };

  // Log de depuración para ver cambios de modo en tiempo real
  React.useEffect(() => {
    console.log('[DRAWER] Estado de Modo Personal:', activeStaffMode);
  }, [activeStaffMode]);

  const menuItems = [
    // --- SECCIÓN CLIENTE (PARA TODOS O SI ESTÁ EN MODO CLIENTE) ---
    {
      id: 10,
      title: 'Centro de Pedidos',
      icon: 'map-marked-alt',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'OrderCenter' }),
      visible: (isAdmin || isCocina || isDelivery) && !isClientMode,
    },
    {
      id: 1,
      title: 'Comprar / Menú',
      icon: 'store',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'InicioTab' }),
      visible: isClientMode || !isStaff || isAdmin
    },
    {
      id: 13,
      title: 'Mi Carrito',
      icon: 'shopping-cart',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'CarritoTab' }),
      showBadge: totalItems > 0,
      badgeCount: totalItems,
      visible: isClientMode || isAdmin
    },
    {
      id: 2,
      title: 'Historial de Compras',
      icon: 'history',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'Historial' }),
      visible: isClientMode || !isStaff
    },
    {
      id: 3,
      title: 'Favoritos',
      icon: 'heart',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'Favoritos' }),
      visible: isClientMode || !isStaff
    },
    {
      id: 4,
      title: 'Inventario Inteligente',
      icon: 'boxes',
      onPress: () => props.navigation.navigate('Inventory'),
      visible: isAdmin
    },
    {
      id: 5,
      title: 'Configuraciones',
      icon: 'cog',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'Configuracion' }),
    },
    {
      id: 6,
      title: 'Vaciar Carrito',
      icon: 'trash',
      onPress: handleClearCart,
      isDestructive: true,
      visible: isClientMode && totalItems > 0
    },
    {
      id: 7,
      title: 'Acerca de',
      icon: 'info-circle',
      onPress: () => showAlert('DSicario v1.0', 'Aplicación de e-commerce desarrollada con React Native\n\n© 2024 DSicario'),
    },
  ];

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background || '#fff' },
    header: { alignItems: 'center', backgroundColor: colors.primary || '#FF6B35', paddingVertical: 24 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 8 },
    userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
    userRole: { fontSize: 10, color: '#fff', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', fontWeight: 'bold' },
    
    modeSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border || '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modeText: { fontSize: 14, fontWeight: 'bold', color: colors.text?.primary || '#333' },
    modeSub: { fontSize: 11, color: colors.text?.secondary || '#666' },

    menuContainer: { marginTop: 12 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    menuItemTitle: { fontSize: 15, color: colors.text?.primary || '#333', flex: 1 },
    destructiveItem: { backgroundColor: 'rgba(244, 67, 54, 0.05)' },
    destructiveText: { color: colors.error || '#f44336' },
    badge: { backgroundColor: colors.primary || '#FF6B35', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
    badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/logo.png')} 
            style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)' }} 
            resizeMode="contain" 
          />
          <Text style={styles.userName}>{username}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <Text style={styles.userRole}>{role?.toUpperCase() || 'CLIENTE'}</Text>
            <Text style={[styles.userRole, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>ID: {userTypeId || 'Cargando...'}</Text>
          </View>
        </View>



        {isStaff && (
          <TouchableOpacity 
            style={[styles.modeSection, { backgroundColor: colors.primary + '15', marginTop: 10, borderBottomWidth: 0, borderRadius: 15, marginHorizontal: 10 }]}
            onPress={() => props.navigation.navigate('MainTabs', { screen: 'StaffModeTab' })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ backgroundColor: colors.primary, padding: 8, borderRadius: 10, marginRight: 12 }}>
                <FontAwesome5 name="user-shield" size={16} color="#FFF" />
              </View>
              <View>
                <Text style={styles.modeText}>MODO EMPLEADO</Text>
                <Text style={styles.modeSub}>{isClientMode ? 'Modo Cliente activo' : 'Modo Personal activo'}</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.menuContainer}>
          {menuItems.map(item => {
            if (item.visible === false) return null;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, item.isDestructive && styles.destructiveItem]}
                onPress={item.onPress}
              >
                <FontAwesome5 
                  name={item.icon} 
                  size={20} 
                  color={item.isDestructive ? (colors.error || '#f44336') : (colors.primary || '#FF6B35')} 
                  style={{ marginRight: 16 }} 
                />
                <Text style={[styles.menuItemTitle, item.isDestructive && styles.destructiveText]}>{item.title}</Text>
                {item.showBadge && item.badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badgeCount > 99 ? '99+' : item.badgeCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        
        <TouchableOpacity 
          style={[styles.menuItem, { marginTop: 20, borderTopWidth: 1, borderTopColor: colors.border || '#eee' }]}
          onPress={() => {
            const handleLogout = async () => {
              console.log(`[USER_PRESENCE] 🔴 CIERRE DE SESIÓN INICIADO para UID: ${firebaseUid}`);
              try {
                const { setOffline } = require('../utils/api');
                if ((userId && userId !== 'N/A') || firebaseUid) {
                  console.log(`[USER_PRESENCE] 🔴 Enviando estado OFFLINE al servidor para UID: ${firebaseUid}, DeliveryID: ${userId}, Name: ${username}`);
                  await setOffline(userId, firebaseUid, username, email);
                }
              } catch (e) {
                console.warn('[USER_PRESENCE] Error marcando offline al salir:', e);
              }
              console.log(`[USER_PRESENCE] 🔴 Cerrando sesión en Firebase...`);
              signOut();
            };

            if (Platform.OS === 'web') {
              const confirm = window.confirm('¿Estás seguro de que quieres salir?');
              if (confirm) {
                handleLogout();
              }
            } else {
              showAlert(
                "Cerrar Sesión",
                "¿Estás seguro de que quieres salir?",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Salir", onPress: handleLogout, style: "destructive" }
                ]
              );
            }
          }}
        >
          <FontAwesome5 name="sign-out-alt" size={20} color={colors.text?.secondary || '#666'} style={{ marginRight: 16 }} />
          <Text style={[styles.menuItemTitle, { color: colors.text?.secondary || '#666' }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Botón Estilo InDrive fijo en la parte inferior */}
      {isStaff && (
        <View style={{ padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border || '#eee' }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsClientMode(!isClientMode)}
            style={{
              backgroundColor: isClientMode ? '#A3E635' : '#1E293B', // InDrive lime green or dark mode
              borderRadius: 24,
              paddingVertical: 18,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 12,
              shadowColor: isClientMode ? '#A3E635' : '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <FontAwesome5 
              name={isClientMode ? "user-shield" : "user"} 
              size={20} 
              color={isClientMode ? '#111' : '#FFF'} 
            />
            <Text style={{ color: isClientMode ? '#111' : '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}>
              {isClientMode ? 'MODO PERSONAL' : 'MODO CLIENTE'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProfileDrawerContent;