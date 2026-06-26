import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import ConfigScreen from '../screens/ConfigScreen';
import ConfigPersonalDataScreen from '../screens/ConfigPersonalDataScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

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
        name="ConfigPersonalData"
        component={ConfigPersonalDataScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default ConfigStack;
