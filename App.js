import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ProductsProvider, CartProvider, DataSyncProvider } from './contexts/AppContext';
import { OrderProvider } from './contexts/OrderContext';
import AppNavigator from './navigation/AppNavigator';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider, useThemeMode } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { getThemeColors } from './theme/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
};
