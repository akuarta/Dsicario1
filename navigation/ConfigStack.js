import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import ConfigScreen from '../screens/ConfigScreen';
import AdminDeliveryScreen from '../screens/AdminDeliveryScreen';

const Stack = createStackNavigator();

const ConfigStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ConfigScreen"
        component={ConfigScreen}
        options={{
          title: 'Configuración',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
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
    </Stack.Navigator>
  );
};

export default ConfigStack;
