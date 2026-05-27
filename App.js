import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
// ✅ Importar notificaciones al inicio para registrar setNotificationHandler
// antes de que cualquier pantalla o contexto monte.
import './utils/notifications';
import { ProductsProvider, CartProvider, DataSyncProvider } from './contexts/AppContext';
import { OrderProvider } from './contexts/OrderContext';
import AppNavigator from './navigation/AppNavigator';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider, useThemeMode } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { getThemeColors } from './theme/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RiderProposalOverlay from './components/RiderProposalOverlay';
import BrowserNotificationBanner from './components/BrowserNotificationBanner';

// Reanimated 3 Web fix
if (Platform.OS === 'web') {
  global._WORKLET = false;
}

const AppContent = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavoritesProvider>
          <UserProvider>
            <DataSyncProvider>
              <ProductsProvider>
                <CartProvider>
                  <OrderProvider>
                    <StatusBar style={darkMode ? "light" : "dark"} backgroundColor={colors.primary} />
                    <AppNavigator />
                    <RiderProposalOverlay />
                    <BrowserNotificationBanner />
                  </OrderProvider>
                </CartProvider>
              </ProductsProvider>
            </DataSyncProvider>
          </UserProvider>
        </FavoritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
