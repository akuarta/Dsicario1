import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import ConfigScreen from '../screens/ConfigScreen';
import AdminDeliveryScreen from '../screens/AdminDeliveryScreen';
import StaffModeScreen from '../screens/StaffModeScreen';

import AdminStaffScreen from '../screens/AdminStaffScreen';
import ConfigPersonalDataScreen from '../screens/ConfigPersonalDataScreen';
import ConfigDeliveryRatesScreen from '../screens/ConfigDeliveryRatesScreen';
import ConfigExchangeRatesScreen from '../screens/ConfigExchangeRatesScreen';
import ConfigPaymentMethodsScreen from '../screens/ConfigPaymentMethodsScreen';

const Stack = createStackNavigator();

const ConfigStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Config"
        component={ConfigScreen}
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
        name="ConfigPersonalData"
        component={ConfigPersonalDataScreen}
        options={{ headerShown: false }}
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

export default ConfigStack;
