import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Platform, Switch } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useCart } from '../contexts/AppContext';

const ProfileDrawerContent = (props) => {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { username, email, role, isClientMode, setIsClientMode, userId } = useUser();
  const { clearCart, getTotalItems } = useCart();
  const totalItems = getTotalItems();
  
  const roleLow = role ? role.toLowerCase() : '';
  const isAdmin = roleLow.includes('admin');
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

  const menuItems = [
    // --- SECCIÓN ADMIN / STAFF (Solo si NO está en modo cliente) ---
    {
      id: 7,
      title: 'Monitor de Cocina',
      icon: 'utensils',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'CocinaAdmin' }),
      visible: (isAdmin || isCocina) && !isClientMode,
    },
    {
      id: 11,
      title: 'Panel de Servicio',
      icon: 'walking',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'WaiterHome' }),
      visible: (isAdmin || isMesero) && !isClientMode,
    },
    {
      id: 12,
      title: 'Vista de Repartidor',
      icon: 'biking',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'RiderView' }),
      visible: isAdmin && !isClientMode,
    },
    {
      id: 8,
      title: 'Administrar Repartidores',
      icon: 'motorcycle',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'RiderAdmin' }),
      visible: isAdmin && !isClientMode,
    },
    {
      id: 9,
      title: 'Gestión de Personal',
      icon: 'users-cog',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'AdminStaff' }),
      visible: isAdmin && !isClientMode,
    },
    {
      id: 10,
      title: 'Centro de Pedidos',
      icon: 'map-marked-alt',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'OrderCenter' }),
      visible: (isAdmin || isCocina || isDelivery) && !isClientMode,
    },
    
    // --- SECCIÓN CLIENTE (PARA TODOS O SI ESTÁ EN MODO CLIENTE) ---
    {
      id: 1,
      title: 'Comprar / Menú',
      icon: 'store',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'InicioTab' }),
      visible: isClientMode || !isStaff || isAdmin // 👈 Admin siempre lo ve
    },
    {
      id: 13,
      title: 'Mi Carrito',
      icon: 'shopping-cart',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'CarritoTab' }),
      showBadge: totalItems > 0,
      badgeCount: totalItems,
      visible: isClientMode || isAdmin // 👈 Admin siempre lo ve
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
      title: 'Configuraciones',
      icon: 'cog',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'Configuracion' }),
    },
    {
      id: 5,
      title: 'Vaciar Carrito',
      icon: 'trash',
      onPress: handleClearCart,
      isDestructive: true,
      visible: isClientMode && totalItems > 0
    },
    {
      id: 6,
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
          <FontAwesome5 name="user-shield" size={48} color="#fff" />
          <Text style={styles.userName}>{username}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <Text style={styles.userRole}>{role?.toUpperCase() || 'CLIENTE'}</Text>
            <Text style={[styles.userRole, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>ID: {userId || 'N/A'}</Text>
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
            if (Platform.OS === 'web') {
              const confirm = window.confirm('¿Estás seguro de que quieres salir?');
              if (confirm) {
                signOut();
              }
            } else {
              Alert.alert(
                "Cerrar Sesión",
                "¿Estás seguro de que quieres salir?",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Salir", onPress: signOut, style: "destructive" }
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