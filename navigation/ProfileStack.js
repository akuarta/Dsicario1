import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/ProfileScreen';
import PurchaseHistoryScreen from '../screens/PurchaseHistoryScreen';
import FavoritesScreen from '../screens/FavoritesScreen';

const Stack = createStackNavigator();

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Perfil" component={ProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PurchaseHistory" component={PurchaseHistoryScreen} options={{ title: 'Historial de Compras', headerStyle: { backgroundColor: '#FF6B35' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' } }} />
    <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favoritos', headerStyle: { backgroundColor: '#FF6B35' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' } }} />
  </Stack.Navigator>
);

export default ProfileStack;
