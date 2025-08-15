import { useThemeMode } from '../contexts/ThemeContext';
import { createGlobalStyles } from '../styles/globalStyles';

export const useGlobalStyles = () => {
  const { darkMode } = useThemeMode();
  return createGlobalStyles(darkMode);
};