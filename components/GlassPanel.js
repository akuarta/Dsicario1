import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

/**
 * GlassPanel — Componente glassmorphism unificado.
 *
 * Props:
 *  intensity    → Intensidad del blur (default: 28).
 *  tint         → 'auto' (sigue darkMode), 'dark', 'light' (default: 'auto').
 *  borderRadius → Esquinas (default: 24).
 *  noBorder     → Si true, omite el borde de cristal.
 *  style        → Estilos extra.
 *  children     → Contenido.
 */
const GlassPanel = ({
  children,
  style,
  intensity = 28,
  tint = 'auto',
  borderRadius = 24,
  noBorder = false,
}) => {
  const { darkMode } = useTheme?.() ?? { darkMode: false };
  const effectiveTint = tint === 'auto' ? (darkMode ? 'dark' : 'light') : tint;
  const isDark = effectiveTint === 'dark';

  const glassStyle = {
    borderRadius,
    borderWidth: noBorder ? 0 : 1,
    borderColor: isDark
      ? 'rgba(255, 255, 255, 0.10)'
      : 'rgba(255, 255, 255, 0.80)',
  };

  // iOS → BlurView nativo real
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={effectiveTint}
        style={[styles.panel, glassStyle, style]}
      >
        {children}
      </BlurView>
    );
  }

  // Android / Web → semi-transparente + backdrop-filter CSS (web moderno)
  const fallbackBg = isDark
    ? 'rgba(20, 20, 24, 0.76)'
    : 'rgba(255, 255, 255, 0.74)';

  return (
    <View
      style={[
        styles.panel,
        glassStyle,
        {
          backgroundColor: fallbackBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
    // Sombra sutil que da profundidad al cristal
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
});

export default GlassPanel;
