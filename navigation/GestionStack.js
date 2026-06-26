import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import GestionScreen from '../screens/GestionScreen';
import AdminDeliveryScreen from '../screens/AdminDeliveryScreen';
import AdminStaffScreen from '../screens/AdminStaffScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminKitchenScreen from '../screens/AdminKitchenScreen';
import AdminWaiterScreen from '../screens/AdminWaiterScreen';
import StaffModeScreen from '../screens/StaffModeScreen';
import ConfigDeliveryRatesScreen from '../screens/ConfigDeliveryRatesScreen';
import ConfigExchangeRatesScreen from '../screens/ConfigExchangeRatesScreen';
import ConfigPaymentMethodsScreen from '../screens/ConfigPaymentMethodsScreen';

const Stack = createStackNavigator();

const GestionStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Gestion"
        component={GestionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminDeliveryScreen"
        component={AdminDeliveryScreen}
        options={{
          title: 'Administrar Repartidores',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="AdminStaff"
        component={AdminStaffScreen}
        options={{
          title: 'Gestión de Personal',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="StaffModeSettings"
        component={StaffModeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          title: 'Gestión de Usuarios',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="AdminKitchen"
        component={AdminKitchenScreen}
        options={{
          title: 'Cocineros',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="AdminWaiter"
        component={AdminWaiterScreen}
        options={{
          title: 'Meseros',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="ConfigDeliveryRates"
        component={ConfigDeliveryRatesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ConfigExchangeRates"
        component={ConfigExchangeRatesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ConfigPaymentMethods"
        component={ConfigPaymentMethodsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default GestionStack;
