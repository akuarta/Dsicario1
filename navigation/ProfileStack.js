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
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PurchaseHistory"
        component={PurchaseHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Configuracion"
        component={ConfigScreen}
        options={{ headerShown: false }}
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
