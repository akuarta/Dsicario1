import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Platform, Switch, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useCart } from '../contexts/AppContext';

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
  
  const isOwner = email?.toLowerCase()?.trim() === 'hairoman28@gmail.com';
  // Temporalmente habilitamos el switch para más gente si algo falla
  const isStaff = isCocina || isDelivery || isMesero || isAdmin || isOwner;

  const showAlert = (title, message) => Alert.alert(title, message);

  const handleClearCart = () => {
    if (totalItems === 0) {
      showAlert('Carrito vacío', 'No hay productos en el carrito');
      return;
    }
    Alert.alert(
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
    props.navigation.navigate('MainTabs', { screen });
  };

  // Log de depuración para ver cambios de modo en tiempo real
  React.useEffect(() => {
    console.log('[DRAWER] Estado de Modo Personal:', activeStaffMode);
  }, [activeStaffMode]);

  const staffSwitches = [
    {
      id: 'cocina',
      label: '🍳 Monitor de Cocina',
      sub: activeStaffMode === 'cocina' ? 'Modo cocina activo' : 'Ver pedidos en cocina',
      color: '#E67E22',
      visible: isStaff && !isClientMode,
      value: activeStaffMode === 'cocina',
      onToggle: () => { 
        const turningOff = activeStaffMode === 'cocina';
        setActiveStaffMode('cocina'); 
        if (turningOff) navigate('InicioTab');
        else navigate('CocinaAdmin');
      },
    },
    {
      id: 'mesero',
      label: '🤵 Modo Mesero',
      sub: activeStaffMode === 'mesero' ? 'Tomando órdenes de mesa' : 'Activar para tomar órdenes',
      color: '#FF8C00',
      visible: isStaff && !isClientMode,
      value: activeStaffMode === 'mesero',
      onToggle: () => { 
        const turningOff = activeStaffMode === 'mesero';
        setActiveStaffMode('mesero'); 
        if (turningOff) navigate('InicioTab');
        else navigate('WaiterHome');
      },
    },
    {
      id: 'repartidor',
      label: '🚴 Vista de Repartidor',
      sub: activeStaffMode === 'repartidor' ? 'Modo repartidor activo' : 'Ver rutas y pedidos',
      color: '#2980B9',
      visible: isStaff && !isClientMode,
      value: activeStaffMode === 'repartidor',
      onToggle: () => { 
        const turningOff = activeStaffMode === 'repartidor';
        setActiveStaffMode('repartidor'); 
        if (turningOff) navigate('InicioTab');
        else navigate('RiderView');
      },
    },
    {
      id: 'personal',
      label: '👥 Gestión de Personal',
      sub: activeStaffMode === 'personal' ? 'Gestión activa' : 'Roles y permisos del staff',
      color: '#16A085',
      visible: isAdmin && !isClientMode,
      value: activeStaffMode === 'personal',
      onToggle: () => { 
        const turningOff = activeStaffMode === 'personal';
        setActiveStaffMode('personal'); 
        if (turningOff) navigate('InicioTab');
        else navigate('AdminStaff');
      },
    },
  ];
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
          <View style={[styles.modeSection, { backgroundColor: colors.primary + '15', marginTop: 10, borderBottomWidth: 0, borderRadius: 15, marginHorizontal: 10 }]}>
            <View>
              <Text style={styles.modeText}>CONTROL DE MODO</Text>
              <Text style={styles.modeSub}>{isClientMode ? 'Viendo como cliente' : 'Viendo como personal'}</Text>
            </View>
            <Switch
              value={isClientMode}
              onValueChange={setIsClientMode}
              trackColor={{ false: '#767577', true: colors.primary + '80' }}
              thumbColor={isClientMode ? colors.primary : '#f4f3f4'}
            />
          </View>
        )}
        {/* Panel de accesos del personal — switches por modo */}
        {isStaff && !isClientMode && (
          <View style={{ marginHorizontal: 10, marginTop: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.text?.secondary || '#888', paddingHorizontal: 4, marginBottom: 4 }}>ACCESOS DE PERSONAL</Text>
            {staffSwitches.filter(s => s.visible !== false).map(sw => (
              <View
                key={sw.id}
                style={[
                  styles.modeSection,
                  { backgroundColor: sw.color + '15', borderBottomWidth: 0, borderRadius: 12, marginBottom: 5, paddingVertical: 10 }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeText, { color: sw.color }]}>{sw.label}</Text>
                  <Text style={styles.modeSub}>{sw.sub}</Text>
                </View>
                {sw.isLink ? (
                  <TouchableOpacity onPress={sw.onToggle} style={{ padding: 4 }}>
                    <FontAwesome5 name="chevron-right" size={14} color={sw.color} />
                  </TouchableOpacity>
                ) : (
                  <Switch
                    value={sw.value || false}
                    onValueChange={sw.onToggle}
                    trackColor={{ false: '#767577', true: sw.color + '80' }}
                    thumbColor={sw.value ? sw.color : '#f4f3f4'}
                  />
                )}
              </View>
            ))}
          </View>
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
                  await setOffline(userId, firebaseUid, username);
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
              Alert.alert(
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
          <FontAwesome5 name="sign-out-alt" size={20} color="#666" style={{ marginRight: 16 }} />
          <Text style={[styles.menuItemTitle, { color: '#666' }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileDrawerContent;