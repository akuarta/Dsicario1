import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SectionProductsScreen from '../screens/SectionProductsScreen';

const Stack = createStackNavigator();

const InicioStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InicioScreen"
        options={{ headerShown: false }}
      >
        {props => <ProductListScreen {...props} mode="inicio" />}
      </Stack.Screen>
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SectionProductsScreen"
        component={SectionProductsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default InicioStack;