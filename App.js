import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ProductsProvider, CartProvider } from './contexts/AppContext';
import AppNavigator from './navigation/AppNavigator';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ProductsProvider>
          <CartProvider>
            <StatusBar style="light" backgroundColor="#FF6B35" />
            <AppNavigator />
          </CartProvider>
        </ProductsProvider>
      </UserProvider>
    </ThemeProvider>
  );
}