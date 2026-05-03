import { Dimensions, Platform } from 'react-native';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

// Helper para generar sombras limpias según plataforma
const createShadow = (h, r, o) => Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: h },
    shadowOpacity: o,
    shadowRadius: r,
  },
  android: {
    elevation: h * 2,
  },
  web: {
    boxShadow: `0px ${h}px ${r}px rgba(0, 0, 0, ${o})`,
  },
});

export const getThemeColors = (darkMode) => {
  const colors = darkMode ? Colors.dark : Colors.light;
  return colors;
};

// Sistema de espaciado
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Compatibility aliases
  extraSmall: 4,
  small: 8,
  medium: 16,
  large: 24,
};

// Tipografía
export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    bold: '700',
  },
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '700' },
  h3: { fontSize: 20, fontWeight: '700' },
  h4: { fontSize: 18, fontWeight: '700' },
  h5: { fontSize: 16, fontWeight: '700' },
  h6: { fontSize: 14, fontWeight: '700' },
  bodyLarge: { fontSize: 18, fontWeight: '400' },
  bodyMedium: { fontSize: 16, fontWeight: '400' },
  bodySmall: { fontSize: 14, fontWeight: '400' },
  bodyExtraSmall: { fontSize: 12, fontWeight: '400' },
  body1: { fontSize: 16, fontWeight: '400' },
  body2: { fontSize: 14, fontWeight: '400' },
  button: { fontSize: 14, fontWeight: '600' },
};

// Dimensiones de pantalla
export const dimensions = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  isTablet: width >= 768,
};

// Bordes
export const borders = {
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 999,
    small: 8,
    medium: 12,
    large: 16,
  },
  width: {
    thin: 1,
    medium: 2,
    thick: 3,
  },
  thin: 1,
};

// Sombras optimizadas
export const shadows = {
  small: createShadow(2, 4, 0.04),
  medium: createShadow(4, 8, 0.08),
  large: createShadow(8, 16, 0.12),
};

// Efectos de cristal
export const glass = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.3)',
    intensity: 20,
  },
  dark: {
    background: 'rgba(0, 0, 0, 0.6)',
    border: 'rgba(255, 255, 255, 0.1)',
    intensity: 30,
  },
};

const theme = {
  colors: getThemeColors(false),
  spacing,
  typography,
  dimensions,
  borders,
  shadows,
  glass,
};

export default theme;