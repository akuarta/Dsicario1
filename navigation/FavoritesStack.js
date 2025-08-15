import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors } from '../theme/theme';
import FavoritesScreen from '../screens/FavoritesScreen';

const Stack = createStackNavigator();

const MenuButton = () => {
  const navigation = useNavigation();
  return (
    <FontAwesome5
      name="bars"
      size={22}
      color={colors.text.white}
      style={{ marginLeft: 16, cursor: 'pointer' }}
      onPress={() => navigation.openDrawer()}
    />
  );
};

const FavoritesStack = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  return (
    <Stack.Navigator>
    <Stack.Screen
      name="FavoritesScreen"
      component={FavoritesScreen}
      options={{
        title: 'Favoritos',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.white,
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <MenuButton />,
      }}
    />
  </Stack.Navigator>
);

};

export default FavoritesStack;

