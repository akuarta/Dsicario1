import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Paleta de colores
export const colors = {
  primary: '#FF6B35',
  secondary: '#F7931E',
  accent: '#FFD23F',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: {
    primary: '#333333',
    secondary: '#666666',
    light: '#999999',
    white: '#FFFFFF',
  },
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
};

// Sistema de espaciado
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
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

// Bordes y sombras
export const borders = {
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
  },
  width: {
    thin: 1,
    medium: 2,
    thick: 3,
  },
};

// Sombras
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

// Tema completo
export const theme = {
  colors,
  spacing,
  typography,
  dimensions,
  borders,
  shadows,
};

export default theme;