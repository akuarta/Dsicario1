import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

// Solo mostramos los tabs que tengan un tabBarIcon definido
export function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, darkMode } = useTheme();
  const isDark = darkMode;

  // Obtener el nombre de la ruta actual (incluso dentro de sub-stacks)
  const currentTabName = state?.routes?.[state?.index]?.name || '';

  // Buscar el nombre más profundo en el state anidado
  const getDeepRouteName = (navState) => {
    if (!navState) return '';
    let route = navState.routes[navState.index];
    while (route && route.state && typeof route.state.index === 'number' && route.state.routes) {
      route = route.state.routes[route.state.index];
    }
    return route ? route.name : '';
  };
  const deepRouteName = getDeepRouteName(state);

  // Pantallas donde NO debe aparecer la barra de pestañas
  const screensWithoutTabBar = [
    'ProductDetail', 'ProductEditor', 'Checkout', 'DeliveryTracking',
    'Carrito', 'Cart', 'CarritoTab', 'Configuracion', 'Config', 'Chat',
    'AdminDeliveryScreen', 'AdminStaff', 'StaffModeSettings',
    'ConfigPersonalData', 'ConfigDeliveryRates', 'ConfigExchangeRates',
    'ConfigPaymentMethods', 'GestionTab', 'Gestion', 'AdminUsers',
    'AdminKitchen', 'AdminWaiter',
  ];

  if (
    screensWithoutTabBar.includes(currentTabName) ||
    screensWithoutTabBar.includes(deepRouteName)
  ) {
    return null;
  }

  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return !!options.tabBarIcon;
  });

  // Colores del cristal según modo
  const glassBackground = isDark ? 'rgba(14, 14, 18, 0.78)' : 'rgba(252, 252, 255, 0.78)';
  const glassBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.95)';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(25,25,35,0.36)';

  const TabItems = (
    <View style={styles.inner}>
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
            activeOpacity={0.7}
          >
            {isFocused ? (
              <View
                style={[
                  styles.activeIconContainer,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                {options.tabBarIcon({ color: '#FFFFFF', size: 20, focused: true })}
              </View>
            ) : (
              <View style={styles.inactiveIconContainer}>
                {options.tabBarIcon({ color: inactiveColor, size: 22, focused: false })}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // iOS → BlurView nativo real
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={isDark ? 55 : 65}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.container,
          { borderColor: glassBorder, bottom: insets.bottom + 14 },
        ]}
      >
        {TabItems}
      </BlurView>
    );
  }

  // Android / Web → semi-transparente + backdrop-filter (web moderno)
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: glassBackground,
          borderColor: glassBorder,
          bottom: insets.bottom + 14,
          // backdrop-filter funciona en web moderno sin librerías extra
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        },
      ]}
    >
      {TabItems}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    right: 18,
    borderRadius: 32,
    borderWidth: 1,
    // Sombra profunda para efecto de elevación glass
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 18,
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  activeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    // Glow del color primario
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.48,
    shadowRadius: 14,
    elevation: 12,
  },
  inactiveIconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
