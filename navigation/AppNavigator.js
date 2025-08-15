import { NavigationContainer, useNavigation, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { FontAwesome5 } from '@expo/vector-icons';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

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
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
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

import ProductDetailScreen from '../screens/ProductDetailScreen';

const ProductStack = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  return (
  <Stack.Navigator>
    <Stack.Screen
      name="ProductList"
      component={ProductListScreen}
      options={({ navigation }) => ({
        title: 'DSicario',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.white,
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <MenuButton />,
      })}
    />
    <Stack.Screen
      name="ProductDetail"
      component={ProductDetailScreen}
      options={({ navigation }) => ({
        title: 'Detalles del Producto',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.white,
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    />
  </Stack.Navigator>
);
};

const CartStack = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  return (
  <Stack.Navigator>
    <Stack.Screen
      name="Cart"
      component={CartScreen}
      options={({ navigation }) => ({
        title: 'Carrito',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.white,
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <MenuButton />,
      })}
    />
  </Stack.Navigator>
);
};

const MainTabs = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.text.secondary,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
    })}
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
};

const AppNavigator = () => {
   const { darkMode } = useThemeMode();

  const appColors = getThemeColors(darkMode);
  const baseTheme = darkMode ? DarkTheme : DefaultTheme;

  const customTheme = {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: appColors.primary,
        background: appColors.background,
        card: appColors.surface,
        text: appColors.text.primary, // Ensure text is a string
        border: appColors.border,
        notification: appColors.error,
      },
    };

    console.log('[DEBUG] AppNavigator -> darkMode:', darkMode);
    console.log('[DEBUG] AppNavigator -> colors:', customTheme.colors);

  return (
  <NavigationContainer theme={customTheme}>
    <Stack.Navigator 
      initialRouteName="Main" // Cambiado de "Login" a "Main"
      screenOptions={{
        headerStyle: { backgroundColor: customTheme.colors?.background || 'red' },
        headerTintColor: customTheme.colors?.text || '#fff'
      }}
    >
      {/* <Stack.Screen name="Login" component={LoginScreen} options={({ navigation }) => ({ headerShown: false })} /> */}
      <Stack.Screen name="Main" component={DrawerNavigator} options={({ navigation }) => ({ headerShown: false })} />
    </Stack.Navigator>
  </NavigationContainer>
);
};

const DrawerNavigator = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  return (
  <Drawer.Navigator
    drawerContent={(props) => <ProfileDrawerContent {...props} />}
    screenOptions={({ navigation }) => ({
      headerShown: false,
      drawerStyle: { backgroundColor: colors.background },
    })}
  >
    <Drawer.Screen name="MainTabs" component={MainTabs} options={{ drawerLabel: 'Inicio', drawerIcon: ({ color, size }) => (<FontAwesome5 name="home" size={size} color={color} />) }} />
    <Drawer.Screen name="Historial" component={PurchaseHistoryStack} options={{ drawerLabel: 'Historial de Compras', drawerIcon: ({ color, size }) => (<FontAwesome5 name="history" size={size} color={color} />) }} />
    <Drawer.Screen name="Favoritos" component={FavoritesStack} options={{ drawerLabel: 'Favoritos', drawerIcon: ({ color, size }) => (<FontAwesome5 name="heart" size={size} color={color} />) }} />
    <Drawer.Screen name="Configuracion" component={ConfigStack} options={{ drawerLabel: 'Configuración', drawerIcon: ({ color, size }) => (<FontAwesome5 name="cog" size={size} color={color} />) }} />
  </Drawer.Navigator>
);
};

export default AppNavigator;