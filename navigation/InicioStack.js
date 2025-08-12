import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
      color="#fff"
      style={{ marginLeft: 16, cursor: 'pointer' }}
      onPress={() => navigation.openDrawer()}
    />
  );
};

const InicioStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Inicio"
      options={{
        title: 'DSicario',
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: '#fff',
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
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
    <Stack.Screen
      name="SectionProductsScreen"
      component={SectionProductsScreen}
      options={({ route }) => ({
        title: route?.params?.sectionName || 'Sección',
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    />
  </Stack.Navigator>
);

export default InicioStack;