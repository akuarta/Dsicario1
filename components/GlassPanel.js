import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

/**
 * Componente que aplica un efecto de cristal (glassmorphism).
 * En iOS usa BlurView para un desenfoque real.
 * En Android/Web usa un fondo semi-transparente como fallback.
 */
const GlassPanel = ({ children, style, intensity = 20, tint = 'light' }) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint={tint} style={[styles.panel, style]}>
        {children}
      </BlurView>
    );
  }

  // Fallback para Android/Web
  return (
    <View style={[
      styles.panel, 
      { backgroundColor: tint === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' },
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default GlassPanel;
