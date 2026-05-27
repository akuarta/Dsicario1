import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import ConfigScreen from '../screens/ConfigScreen';
import AdminDeliveryScreen from '../screens/AdminDeliveryScreen';
import StaffModeScreen from '../screens/StaffModeScreen';

import AdminStaffScreen from '../screens/AdminStaffScreen';

const Stack = createStackNavigator();

const ConfigStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ConfigScreen"
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
    </Stack.Navigator>
  );
};

export default ConfigStack;
