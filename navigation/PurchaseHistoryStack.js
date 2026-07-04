import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import PurchaseHistoryScreen from '../screens/PurchaseHistoryScreen';

const Stack = createStackNavigator();

const PurchaseHistoryStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="PurchaseHistory"
        component={PurchaseHistoryScreen}
      />
    </Stack.Navigator>
  );
};

export default PurchaseHistoryStack;
