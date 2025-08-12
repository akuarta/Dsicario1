import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome5 } from '@expo/vector-icons';
import ProductListScreen from '../screens/ProductListScreen';
import InicioStack from './InicioStack';
import CartScreen from '../screens/CartScreen';
import ProfileStack from './ProfileStack';
import ProfileDrawerContent from '../components/ProfileDrawerContent';
import PurchaseHistoryScreen from '../screens/PurchaseHistoryScreen';
import PurchaseHistoryStack from './PurchaseHistoryStack';
import FavoritesScreen from '../screens/FavoritesScreen';
import FavoritesStack from './FavoritesStack';
import ConfigStack from './ConfigStack';
import LoginScreen from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
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

import ProductDetailScreen from '../screens/ProductDetailScreen';

const ProductStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ProductList"
      component={ProductListScreen}
      options={{
        title: 'DSicario',
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <MenuButton />,
      }}
    />
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
  </Stack.Navigator>
);

const CartStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Cart"
      component={CartScreen}
      options={{
        title: 'Carrito',
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <MenuButton />,
      }}
    />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#FF6B35',
      tabBarInactiveTintColor: '#666',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
      },
    }}
  >
    <Tab.Screen
      name="Inicio"
      component={InicioStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Explorar"
      component={ProductStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="compass" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Carrito"
      component={CartStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="shopping-cart" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Perfil"
      component={ProfileStack}
      options={{
        tabBarButton: () => null,
        tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name="user-alt" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Main" component={DrawerNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  </NavigationContainer>
);

const DrawerNavigator = () => (
  <Drawer.Navigator
    drawerContent={(props) => <ProfileDrawerContent {...props} />}
    screenOptions={{
      headerShown: false,
      drawerStyle: { backgroundColor: '#fff' },
    }}
  >
    <Drawer.Screen name="MainTabs" component={MainTabs} options={{ drawerLabel: 'Inicio', drawerIcon: ({ color, size }) => (<FontAwesome5 name="home" size={size} color={color} />) }} />
    <Drawer.Screen name="Historial" component={PurchaseHistoryStack} options={{ drawerLabel: 'Historial de Compras', drawerIcon: ({ color, size }) => (<FontAwesome5 name="history" size={size} color={color} />) }} />
    <Drawer.Screen name="Favoritos" component={FavoritesStack} options={{ drawerLabel: 'Favoritos', drawerIcon: ({ color, size }) => (<FontAwesome5 name="heart" size={size} color={color} />) }} />
    <Drawer.Screen name="Configuracion" component={ConfigStack} options={{ drawerLabel: 'Configuración', drawerIcon: ({ color, size }) => (<FontAwesome5 name="cog" size={size} color={color} />) }} />
  </Drawer.Navigator>
);

export default AppNavigator;