import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useCart } from '../contexts/AppContext';

const ProfileDrawerContent = (props) => {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { username, email, role } = useUser();
  const { clearCart, getTotalItems } = useCart();
  const totalItems = getTotalItems();
  
  const isAdmin = role && role.toLowerCase() === 'admin';
  const isCocina = role && role.toLowerCase() === 'cocina';

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
    {
      id: 1,
      title: 'Mi Carrito',
      icon: 'shopping-cart',
      onPress: () => props.navigation.navigate('MainTabs', { screen: 'Carrito' }),
      showBadge: totalItems > 0,
      badgeCount: totalItems
    },
    {
      id: 10,
      title: 'Centro de Pedidos',
      icon: 'map-marked-alt',
      onPress: () => props.navigation.navigate('OrderCenter'),
    },
    {
      id: 2,
      title: 'Historial de Compras',
      icon: 'history',
      onPress: () => props.navigation.navigate('Historial'),
    },
    {
      id: 3,
      title: 'Favoritos',
      icon: 'heart',
      onPress: () => props.navigation.navigate('Favoritos'),
    },
    {
      id: 4,
      title: 'Configuración',
      icon: 'cog',
      onPress: () => {
        props.navigation.navigate('Configuracion');
      },
    },
    {
      id: 5,
      title: 'Vaciar Carrito',
      icon: 'trash',
      onPress: handleClearCart,
      isDestructive: true
    },
    {
      id: 6,
      title: 'Acerca de',
      icon: 'info-circle',
      onPress: () => showAlert('DSicario v1.0', 'Aplicación de e-commerce desarrollada con React Native\n\n© 2024 DSicario'),
    },
    {
      id: 7,
      title: 'Monitor de Cocina',
      icon: 'utensils',
      onPress: () => props.navigation.navigate('CocinaAdmin'),
      visible: isAdmin || isCocina,
    },
    {
      id: 8,
      title: 'Panel de Repartidores',
      icon: 'motorcycle',
      onPress: () => props.navigation.navigate('RiderAdmin'),
      visible: isAdmin,
    },
    {
      id: 9,
      title: 'Gestión de Personal',
      icon: 'users-cog',
      onPress: () => props.navigation.navigate('AdminStaff'),
      visible: isAdmin,
    },
  ];

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background || '#fff' },
    header: { alignItems: 'center', backgroundColor: colors.primary || '#FF6B35', paddingVertical: 32 },
    userName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 8 },
    userEmail: { fontSize: 14, color: '#fff', marginBottom: 8 },
    menuContainer: { marginTop: 24 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuItemTitle: { fontSize: 16, color: colors.text?.primary || '#333', flex: 1 },
    destructiveItem: { backgroundColor: 'rgba(244, 67, 54, 0.05)' },
    destructiveText: { color: colors.error || '#f44336' },
    badge: { backgroundColor: colors.primary || '#FF6B35', borderRadius: 12, paddingHorizontal: 8, marginLeft: 8 },
    badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <FontAwesome5 name="user" size={32} color="#fff" />
          <Text style={styles.userName}>{username}</Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>
        <View style={styles.menuContainer}>
          {menuItems.filter(item => item.visible !== false).map(item => (
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
          ))}
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