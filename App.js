import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ProductsProvider, CartProvider } from './contexts/AppContext';
import AppNavigator from './navigation/AppNavigator';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider, useThemeMode } from './contexts/ThemeContext';
import { getThemeColors } from './theme/theme';

const AppContent = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  return (
    <UserProvider>
      <ProductsProvider>
        <CartProvider>
          <StatusBar style={darkMode ? "light" : "dark"} backgroundColor={colors.primary} />
          <AppNavigator />
        </CartProvider>
      </ProductsProvider>
    </UserProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}