// Paleta de colores unificada — Sincronizada con el nuevo tema DSicario
const common = {
  primary: '#E31837', // Nuevo Rojo DSicario
  secondary: '#FF9500', // Naranja Cálido
  accent: '#FF9500',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

const dark = {
  ...common,
  primary: '#FF3B30',
  accent: '#FF9500',
  background: '#121212',
  card: '#1C1C1E',
  surface: '#121212', // Agregado para compatibilidad
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D1D6',
    light: '#8E8E93',
  },
  textPrimary: '#FFFFFF', // Alias para compatibilidad
  textSecondary: '#D1D1D6', // Alias para compatibilidad
  border: '#2C2C2E',
};

const light = {
  ...common,
  primary: '#E31837',
  background: '#F2F2F7',
  card: '#FFFFFF',
  surface: '#FFFFFF', // Agregado para compatibilidad
  text: {
    primary: '#000000',
    secondary: '#3C3C43',
    light: '#8E8E93',
  },
  textPrimary: '#000000', // Alias para compatibilidad
  textSecondary: '#3C3C43', // Alias para compatibilidad
  border: '#C7C7CC',
};

export const Colors = {
  ...light,
  common,
  light,
  dark,
};
