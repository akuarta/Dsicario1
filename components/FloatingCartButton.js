import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useCart } from '../contexts/AppContext';
import { getThemeColors, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const FloatingCartButton = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { getTotalItems } = useCart();
  
  // ✅ Selector de ruta con seguridad mejorada para evitar errores de contexto
  const routeName = useNavigationState(state => {
    try {
      if (!state) return '';
      let route = state.routes[state.index];
      while (route && route.state) {
        route = route.state.routes[route.state.index];
      }
      return route ? route.name : '';
    } catch (e) {
      return '';
    }
  });

  const totalItems = getTotalItems();

  // Pantallas donde NO debe aparecer el botón
  const hiddenScreens = ['Cart', 'Carrito', 'Checkout', 'DeliveryTracking', 'CocinaAdmin', 'RiderAdmin', 'AdminStaff', 'CarritoTab'];
  
  // Ajustar posición si hay elementos fijos abajo (como en ProductDetail)
  const isProductDetail = routeName === 'ProductDetail';
  const bottomPosition = isProductDetail ? 220 : 95;

  // Si no hay items o estamos en pantalla redundante, no renderizar
  if (totalItems === 0 || hiddenScreens.includes(routeName)) return null;

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.primary, 
          bottom: bottomPosition 
        }
      ]} 
      onPress={() => navigation.navigate('Main', { screen: 'MainTabs', params: { screen: 'CarritoTab' } })}
      activeOpacity={0.8}
    >
      <FontAwesome5 name="shopping-cart" size={20} color="white" />
      <View style={[styles.badge, { backgroundColor: colors.error }]}>
        <Text style={styles.badgeText}>{totalItems}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
    zIndex: 9999,
    elevation: 10,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default FloatingCartButton;
