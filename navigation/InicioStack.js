import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors } from '../theme/theme';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SectionProductsScreen from '../screens/SectionProductsScreen';

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

const InicioStack = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  return (
    <Stack.Navigator>
    <Stack.Screen
      name="Inicio"
      options={{
        title: 'DSicario',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.white,
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <MenuButton />, 
      }}
    >
      {props => <ProductListScreen {...props} mode="inicio" />}
    </Stack.Screen>
    <Stack.Screen
      name="ProductDetail"
      component={ProductDetailScreen}
      options={{
        title: 'Detalles del Producto',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
    <Stack.Screen
      name="SectionProductsScreen"
      component={SectionProductsScreen}
      options={({ route }) => ({
        title: route?.params?.sectionName || 'Sección',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.white,
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    />
  </Stack.Navigator>
);

}; // Close InicioStack component
export default InicioStack;