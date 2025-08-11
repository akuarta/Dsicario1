import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // mode: 'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState('system');
  const [darkMode, setDarkMode] = useState(Appearance.getColorScheme() === 'dark');

  useEffect(() => {
    if (themeMode === 'system') {
      const listener = ({ colorScheme }) => setDarkMode(colorScheme === 'dark');
      const subscription = Appearance.addChangeListener(listener);
      setDarkMode(Appearance.getColorScheme() === 'dark');
      return () => {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      };
    } else {
      setDarkMode(themeMode === 'dark');
    }
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeContext);
