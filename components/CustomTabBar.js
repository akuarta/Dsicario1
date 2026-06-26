import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationState } from '@react-navigation/native';

// Solo mostramos los tabs que tengan un tabBarIcon definido
export function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, darkMode } = useTheme();
  const isDark = darkMode;

  // Obtener el nombre de la ruta actual (incluso dentro de sub-stacks)
  const routeName = useNavigationState(state => {
    if (!state) return "";
    let route = state.routes[state.index];
    while (route && route.state && typeof route.state.index === 'number' && route.state.routes) {
      route = route.state.routes[route.state.index];
    }
    return route ? route.name : "";
  });

  // Pantallas de detalle, configuración o pago donde NO debe aparecer la barra de pestañas
  const screensWithoutTabBar = [
    'ProductDetail',
    'ProductEditor',
    'Checkout',
    'DeliveryTracking',
    'Carrito',
    'Cart',
    'CarritoTab',
    'Configuracion',
    'Config',
    'AdminDeliveryScreen',
    'AdminStaff',
    'StaffModeSettings',
    'ConfigPersonalData',
    'ConfigDeliveryRates',
    'ConfigExchangeRates',
    'ConfigPaymentMethods'
  ];

  if (screensWithoutTabBar.includes(routeName)) {
    return null;
  }

  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return !!options.tabBarIcon;
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          bottom: insets.bottom + 12,
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === state.routes.indexOf(route);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.8}
          >
            {isFocused ? (
              <View style={[styles.activeIconContainer, { backgroundColor: '#FFFFFF' }]}>
                {options.tabBarIcon({ color: colors.primary, size: 22, focused: isFocused })}
              </View>
            ) : (
              <View style={styles.inactiveIconContainer}>
                {options.tabBarIcon({ color: 'rgba(255, 255, 255, 0.65)', size: 24, focused: isFocused })}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 30,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  inactiveIconContainer: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
