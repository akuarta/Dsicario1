import React, { useState, useEffect } from 'react';
import { Platform, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
// ✅ Importar logger al inicio para monkey-patch console.log
// antes de cualquier otro módulo, para capturar todos los logs.
import './utils/logger';
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
import { useKeepAwake } from 'expo-keep-awake';
import RiderProposalOverlay from './components/RiderProposalOverlay';
import BrowserNotificationBanner from './components/BrowserNotificationBanner';
import OnboardingTutorial, { hasSeenOnboarding } from './components/OnboardingTutorial';

// Reanimated 3 Web fix
if (Platform.OS === 'web') {
  global._WORKLET = false;
}

// Tope global de escala de fuente del sistema.
// El teléfono amplía la letra al 1.45x y agranda la pantalla (461 vs 440):
// TODO se veía gigante y roto (columnas de 40px, textos encimados, cortes
// a media palabra). La app usa su propio tamaño (1.0x) para verse como fue
// diseñada. Quien necesite letra más grande, que la suba en el teléfono:
// eso la agranda en todas las apps sin romper ningún diseño.
if (!Text.defaultProps) Text.defaultProps = {};
Text.defaultProps.maxFontSizeMultiplier = 1;
Text.defaultProps.allowFontScaling = false;

const AppContent = () => {
  // Pantalla siempre encendida mientras la app esté abierta (repartos).
  useKeepAwake();
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    hasSeenOnboarding().then(seen => setShowOnboarding(!seen));
  }, []);

  if (showOnboarding === null) return null; // Loading

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />
      </SafeAreaProvider>
    );
  }
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavoritesProvider>
          <UserProvider>
            <DataSyncProvider>
              <ProductsProvider>
                <CartProvider>
                  <OrderProvider>
                    {/* Barra translúcida global: cada header sube hasta el borde
                        superior con su propio fondo (CustomHeader, Inicio,
                        Rider). Iconos blancos: todos los headers son oscuros
                        (rojo/cristal) en la zona superior. */}
                    <StatusBar style={darkMode ? "light" : "dark"} translucent backgroundColor="transparent" />
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
