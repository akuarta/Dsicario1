import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import FavoritesScreen from '../screens/FavoritesScreen';

const Stack = createStackNavigator();

const FavoritesStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="FavoritesScreen"
        component={FavoritesScreen}
      />
    </Stack.Navigator>
  );
};

export default FavoritesStack;
