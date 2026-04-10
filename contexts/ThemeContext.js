import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme() || 'light';
  const [themeMode, setThemeMode] = useState('system');
  const [currentTheme, setCurrentTheme] = useState(
    systemColorScheme === 'dark' ? 'dark' : 'light'
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@dsicario_theme');
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (err) {
        console.error('Error loading theme:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Sync currentTheme with themeMode and system
  useEffect(() => {
    if (themeMode === 'system') {
      setCurrentTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setCurrentTheme(themeMode);
    }

    if (isLoaded && themeMode !== 'system') {
      AsyncStorage.setItem('@dsicario_theme', themeMode).catch(err =>
        console.error('Error saving theme:', err)
      );
    }
  }, [themeMode, systemColorScheme, isLoaded]);

  const toggleTheme = async () => {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    try {
      await AsyncStorage.setItem('@dsicario_theme', next);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const setTheme = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem('@dsicario_theme', mode);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  // Colores flat (API idéntica a TallerApp)
  const colors = Colors[currentTheme] || Colors.light;

  // darkMode bool para compatibilidad con pantallas existentes de DSicario
  const darkMode = currentTheme === 'dark';
  const isDark = darkMode;

  return (
    <ThemeContext.Provider
      value={{
        // API estilo TallerApp
        themeMode,
        currentTheme,
        colors,
        toggleTheme,
        setTheme,
        isDark,
        // Compatibilidad con pantallas DSicario existentes
        darkMode,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Hook estilo TallerApp — usado en los nuevos componentes de navegación
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook legacy — compatibilidad con pantallas de DSicario que ya existen
export const useThemeMode = () => useContext(ThemeContext);