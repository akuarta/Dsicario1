import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Home, Compass, ShoppingCart, User, ClipboardList, History, CalendarClock } from 'lucide-react-native';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { ProductsContext } from '../contexts/AppContext';

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
import ProductEditorScreen from '../screens/ProductEditorScreen';

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
      <Stack.Screen 
        name="ProductEditor" 
        component={ProductEditorScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const PreOrderStack = () => {
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
        name="PreOrderList" 
        component={ProductListScreen} 
        options={{ title: 'Pre-Ordenes' }}
        initialParams={{ mode: 'preorder' }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProductEditor" 
        component={ProductEditorScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { colors } = useTheme();
  const { role, isClientMode } = useUser();
  const roleLow = role ? role.toLowerCase() : '';
  
  const isCocina = roleLow.includes('cocina') || roleLow.includes('cosina');
  const isDelivery = roleLow.includes('delivery') || roleLow.includes('repartidor');
  const isMesero = roleLow.includes('mesero');
  const isAdmin = roleLow.includes('admin');
  
  const showServiceScreen = !isClientMode && (isCocina || isDelivery || isMesero);

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
        component={showServiceScreen ? (isCocina ? KitchenScreen : (isDelivery ? RiderScreen : WaiterScreen)) : InicioStack}
        options={{
          tabBarLabel: showServiceScreen ? (isCocina ? 'MONITOR' : (isDelivery ? 'ENTREGAS' : 'SERVICIO')) : 'INICIO',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="ExplorarTab"
        component={ExplorarStack}
        options={{
          tabBarLabel: 'EXPLORAR',
          tabBarIcon: ({ color }) => <Compass color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="PreOrdenTab"
        component={PreOrderStack}
        options={{
          tabBarLabel: 'PRE-ORDEN',
          tabBarIcon: ({ color }) => <CalendarClock color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="PedidosTab"
        component={OrderCenterScreen}
        options={{
          tabBarLabel: 'PEDIDOS',
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} />,
        }}
      />
      <Tab.Screen name="OrderCenter" component={OrderCenterScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen 
        name="Historial" 
        component={PurchaseHistoryStack} 
        options={{ 
          tabBarLabel: 'HISTORIAL',
          tabBarIcon: ({ color }) => <History color={color} size={24} />,
        }} 
      />
      <Tab.Screen name="Favoritos" component={FavoritesStack} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Configuracion" component={ConfigStack} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="DeliveryTracking" component={DeliveryTrackingScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="CarritoTab" component={CartStack} options={{ tabBarButton: () => null }} />
      
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
      useLegacyImplementation={false}
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
  const { syncUserRole, isClientMode, role } = useUser();
  const [roleReady, setRoleReady] = useState(false);
  
  // 🔑 Usar el contexto directamente SIN useProducts() para evitar re-renders
  // causados por cambios en isEditorMode que están en el mismo useMemo del contexto.
  // Solo necesitamos saber si los productos ya cargaron una vez al inicio.
  const productsCtx = React.useContext(ProductsContext);
  const productsAlreadyLoadedRef = useRef(false);
  if (productsCtx && !productsCtx.isLoading) {
    productsAlreadyLoadedRef.current = true;
  }
  const productsLoading = !productsAlreadyLoadedRef.current && (productsCtx?.isLoading ?? true);

  const roleLow = role ? role.toLowerCase() : '';
  const isAdmin = roleLow.includes('admin');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setRoleReady(true);
      return;
    }
    syncUserRole(user?.email).finally(() => setRoleReady(true));
  }, [authLoading, isAuthenticated, user?.email]);

  const isLoading = authLoading || !roleReady || (isAuthenticated && productsLoading);

  if (isLoading) return <FullLoadingScreen />;

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
      {/* 🛒 Botón flotante ahora visible para Modo Cliente O para el Admin */}
      {isAuthenticated && (isClientMode || isAdmin) && <FloatingCartButton />}
    </NavigationContainer>
  );
};

export default AppNavigator;
