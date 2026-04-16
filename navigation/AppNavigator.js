import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Home, Compass, ShoppingCart, User, ClipboardList } from 'lucide-react-native';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useProducts } from '../contexts/AppContext';

import InicioStack from './InicioStack';
import CartStack from './CartStack';
import ProfileStack from './ProfileStack';
import PurchaseHistoryStack from './PurchaseHistoryStack';
import FavoritesStack from './FavoritesStack';
import ConfigStack from './ConfigStack';
import ProfileDrawerContent from '../components/ProfileDrawerContent';
import DeliveryTrackingScreen from '../screens/DeliveryTrackingScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import FullLoadingScreen from '../components/FullLoadingScreen';
import { CustomTabBar } from '../components/CustomTabBar';
import FloatingCartButton from '../components/FloatingCartButton';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import KitchenScreen from '../screens/KitchenScreen';
import RiderScreen from '../screens/RiderScreen';
import WaiterScreen from '../screens/WaiterScreen';
import AdminStaffScreen from '../screens/AdminStaffScreen';
import ProductListScreen from '../screens/ProductListScreen';
import OrderCenterScreen from '../screens/OrderCenterScreen';
import AdminDeliveryScreen from '../screens/AdminDeliveryScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

const ExplorarStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={{ title: 'Explorar Menú' }}
        initialParams={{ mode: 'explorar' }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { colors } = useTheme();
  const { role } = useUser();
  
  const isCocina = role === 'Cocina' || role === 'Cosina';
  const isDelivery = role === 'Delivery';
  const isMesero = role === 'Mesero' || role?.toLowerCase() === 'mesero';
  const isAdmin = role?.toLowerCase() === 'admin';
  
  const isRestricted = (isCocina || isDelivery || isMesero) && !isAdmin;

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="InicioTab"
        component={isCocina ? KitchenScreen : (isDelivery ? RiderScreen : (isMesero ? WaiterScreen : InicioStack))}
        options={{
          tabBarLabel: isCocina ? 'MONITOR' : (isDelivery ? 'ENTREGAS' : (isMesero ? 'SERVICIO' : 'INICIO')),
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      
      {!isRestricted && (
        <Tab.Screen
          name="ExplorarTab"
          component={ExplorarStack}
          options={{
            tabBarLabel: 'EXPLORAR',
            tabBarIcon: ({ color }) => <Compass color={color} size={24} />,
          }}
        />
      )}

      {!isRestricted && (
        <Tab.Screen
          name="CarritoTab"
          component={CartStack}
          options={{
            tabBarLabel: 'CARRITO',
            tabBarIcon: ({ color }) => <ShoppingCart color={color} size={24} />,
          }}
        />
      )}

      {!isRestricted && (
        <Tab.Screen
          name="PedidosTab"
          component={OrderCenterScreen}
          options={{
            tabBarLabel: 'PEDIDOS',
            tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} />,
          }}
        />
      )}

      {/* Hidden tabs for Admin/Specialized navigation */}
      <Tab.Screen name="OrderCenter" component={OrderCenterScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Historial" component={PurchaseHistoryStack} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Favoritos" component={FavoritesStack} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Configuracion" component={ConfigStack} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="DeliveryTracking" component={DeliveryTrackingScreen} options={{ tabBarButton: () => null }} />
      
      {(isAdmin || isCocina) && (
        <Tab.Screen name="CocinaAdmin" component={KitchenScreen} options={{ tabBarButton: () => null }} />
      )}

      {(isAdmin || isMesero) && (
        <Tab.Screen name="WaiterHome" component={WaiterScreen} options={{ tabBarButton: () => null }} />
      )}

      {isAdmin && (
        <>
          <Tab.Screen name="RiderView" component={RiderScreen} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="RiderAdmin" component={AdminDeliveryScreen} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="AdminStaff" component={AdminStaffScreen} options={{ tabBarButton: () => null }} />
        </>
      )}

    </Tab.Navigator>
  );
};

const DrawerNavigator = () => {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <ProfileDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: colors.primary,
        drawerStyle: { backgroundColor: colors.background, width: 300 },
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} options={{ drawerLabel: 'Inicio' }} />
    </Drawer.Navigator>
  );
};

const AppNavigator = () => {
  const { darkMode } = useTheme();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { syncUserRole } = useUser();
  const { isLoading: productsLoading } = useProducts();
  const [roleReady, setRoleReady] = useState(false);

  // Espera el rol sin timeout agresivo para asegurar que el Admin vea lo que corresponde
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setRoleReady(true);
      return;
    }
    
    // Solo sincronizar si el rol aún no está definido o es el 'Invitado' por defecto
    syncUserRole(user?.email).finally(() => {
      setRoleReady(true);
    });
  }, [authLoading, isAuthenticated, user?.email]);

  // Espera real: Firebase auth + rol de usuario + productos si está autenticado
  const isLoading = authLoading || !roleReady || (isAuthenticated && productsLoading);

  if (isLoading) {
    return <FullLoadingScreen />;
  }

  return (
    <NavigationContainer theme={darkMode ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={DrawerNavigator} />
        )}
      </Stack.Navigator>
      {isAuthenticated && <FloatingCartButton />}
    </NavigationContainer>
  );
};

export default AppNavigator;
