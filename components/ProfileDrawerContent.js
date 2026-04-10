import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
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
          text: 'Sí, Vaciar', 
          onPress: () => {
            clearCart();
            showAlert('Éxito', 'Carrito vaciado correctamente');
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Mi Perfil',
      icon: 'user-circle',
      onPress: () => props.navigation.navigate('Profile'),
      visible: true,
    },
    {
      title: 'Mis Pedidos',
      icon: 'history',
      onPress: () => props.navigation.navigate('Orders'),
      visible: true,
    },
    {
      title: 'Panel Admin',
      icon: 'cog',
      onPress: () => props.navigation.navigate('Admin'),
      visible: isAdmin,
    },
    {
      title: 'Monitor Cocina',
      icon: 'utensils',
      onPress: () => props.navigation.navigate('Kitchen'),
      visible: isAdmin || isCocina,
    },
    {
      title: 'Vaciar Carrito',
      icon: 'trash-alt',
      onPress: handleClearCart,
      visible: true,
      color: '#ff4444',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarContainer}>
          <FontAwesome5 name="user-alt" size={40} color="#fff" />
        </View>
        <Text style={styles.usernameText}>{username || 'Usuario'}</Text>
        <Text style={styles.emailText}>{email || ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{(role || 'CLIENTE').toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView style={styles.menuContainer}>
        {menuItems.filter(item => item.visible).map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <FontAwesome5 
              name={item.icon} 
              size={20} 
              color={item.color || colors.text.secondary} 
              style={styles.menuIcon} 
            />
            <Text style={[
              styles.menuText, 
              { color: item.color || colors.text.primary }
            ]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.border }]}
          onPress={() => {
            Alert.alert(
              'Cerrar Sesión',
              '¿Estás seguro de que quieres salir?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', onPress: () => signOut() },
              ]
            );
          }}
        >
          <FontAwesome5 name="sign-out-alt" size={18} color="#ff4444" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  emailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuIcon: {
    width: 30,
    marginRight: 15,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  logoutText: {
    marginLeft: 10,
    color: '#ff4444',
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileDrawerContent;