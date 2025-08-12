import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCart } from '../contexts/AppContext';
import theme from '../theme';

const { colors, spacing, typography, borders } = theme;

const ProfileDrawerContent = ({ navigation }) => {
  const { clearCart, getTotalItems } = useCart();
  const totalItems = getTotalItems();

  const showAlert = (title, message) => Alert.alert(title, message);

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

  const menuItems = [
    {
      id: 1,
      title: 'Mi Carrito',
      icon: 'shopping-cart',
      onPress: () => navigation.navigate('MainTabs', { screen: 'Carrito' }),
      showBadge: totalItems > 0,
      badgeCount: totalItems
    },
    {
      id: 2,
      title: 'Historial de Compras',
      icon: 'history',
      onPress: () => navigation.navigate('Historial'),
    },
    {
      id: 3,
      title: 'Favoritos',
      icon: 'heart',
      onPress: () => navigation.navigate('Favoritos'),
    },
    {
      id: 4,
      title: 'Configuración',
      icon: 'cog',
      onPress: () => {
        console.log('Drawer navega a Configuracion');
        navigation.navigate('Configuracion');
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
  ];

  const { username, email } = require('../contexts/UserContext').useUser();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <FontAwesome5 name="user" size={32} color="#fff" />
          <Text style={styles.userName}>{username}</Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>
        <View style={styles.menuContainer}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, item.isDestructive && styles.destructiveItem]}
              onPress={item.onPress}
            >
              <FontAwesome5 name={item.icon} size={20} color={item.isDestructive ? colors.error : colors.primary} style={{ marginRight: 16 }} />
              <Text style={[styles.menuItemTitle, item.isDestructive && styles.destructiveText]}>{item.title}</Text>
              {item.showBadge && item.badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badgeCount > 99 ? '99+' : item.badgeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', backgroundColor: '#FF6B35', paddingVertical: 32 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  userEmail: { fontSize: 14, color: '#fff', marginBottom: 8 },
  menuContainer: { marginTop: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemTitle: { fontSize: 16, color: '#333', flex: 1 },
  destructiveItem: { backgroundColor: 'rgba(244, 67, 54, 0.05)' },
  destructiveText: { color: colors.error },
  badge: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 8, marginLeft: 8 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});

export default ProfileDrawerContent;