import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import ProfileScreen from '../screens/ProfileScreen';
import PurchaseHistoryScreen from '../screens/PurchaseHistoryScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ConfigScreen from '../screens/ConfigScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import OrderCenterScreen from '../screens/OrderCenterScreen';
import DeliveryTrackingScreen from '../screens/DeliveryTrackingScreen';

const Stack = createStackNavigator();

const ProfileStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          title: 'Mi Perfil',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="PurchaseHistory"
        component={PurchaseHistoryScreen}
        options={{
          title: 'Historial de Compras',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favoritos',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="Configuracion"
        component={ConfigScreen}
        options={{
          title: 'Configuración',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderCenter"
        component={OrderCenterScreen}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="DeliveryTracking"
        component={DeliveryTrackingScreen}
        options={{
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
};

export default ProfileStack;
