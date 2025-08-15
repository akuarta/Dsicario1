import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors } from '../theme/theme';
import PurchaseHistoryScreen from '../screens/PurchaseHistoryScreen';

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

const PurchaseHistoryStack = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  return (
    <Stack.Navigator>
    <Stack.Screen
      name="PurchaseHistory"
      component={PurchaseHistoryScreen}
      options={{
        title: 'Historial de Compras',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.white,
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <MenuButton />,
      }}
    />
  </Stack.Navigator>
);

}; // Close PurchaseHistoryStack component

export default PurchaseHistoryStack;

