import React, { useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const DeliveryMap = ({ darkMode, colors, pulseAnim, progreso = 0.5 }) => {
  // Simulación de coordenadas en el mapa falso
  const startPos = { x: 40, y: 150 };
  const endPos = { x: width - 80, y: 300 };
  
  // Calculamos la posición actual del repartidor basada en el progreso
  const riderX = startPos.x + (endPos.x - startPos.x) * progreso;
  const riderY = startPos.y + (endPos.y - startPos.y) * progreso;

  return (
    <View style={[styles.fakeMap, { backgroundColor: darkMode ? '#1A1A1A' : '#F0F2F5' }]}>
      {/* Cuadrícula estética */}
      <View style={[styles.grid, { borderColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        {[...Array(10)].map((_, i) => <View key={`v-${i}`} style={[styles.gridLineV, { left: `${i * 10}%` }]} />)}
        {[...Array(10)].map((_, i) => <View key={`h-${i}`} style={[styles.gridLineH, { top: `${i * 10}%` }]} />)}
      </View>

      {/* Ruta dibujada (SVG sim con View) */}
      <View style={[styles.pathTrack, { backgroundColor: colors.border }]} />
      <View style={[styles.pathActive, { 
        backgroundColor: colors.primary, 
        width: (width - 120) * progreso,
        left: 60,
        top: 225,
        transform: [{ rotate: '25deg' }]
      }]} />
      
      {/* Punto de origen (Restaurante) */}
      <View style={[styles.marker, { left: startPos.x, top: startPos.y }]}>
        <View style={[styles.markerBadge, { backgroundColor: colors.surface, ...styles.shadow }]}>
          <FontAwesome5 name="store" size={14} color={colors.text.secondary} />
        </View>
        <View style={[styles.dot, { backgroundColor: colors.text.light }]} />
      </View>
      
      {/* Repartidor con animación de pulso */}
      <Animated.View style={[
        styles.riderPin, 
        { 
          left: riderX,
          top: riderY,
          transform: [{ scale: pulseAnim }] 
        }
      ]}>
        <View style={[styles.riderIcon, { backgroundColor: colors.primary, ...styles.shadow }]}>
          <FontAwesome5 name="motorcycle" size={18} color="#FFF" />
        </View>
        <View style={[styles.pulseCircle, { borderColor: colors.primary }]} />
      </Animated.View>
      
      {/* Destino (Casa del cliente) */}
      <View style={[styles.marker, { left: endPos.x, top: endPos.y }]}>
        <View style={[styles.markerBadge, { backgroundColor: colors.accent, ...styles.shadow }]}>
          <FontAwesome5 name="home" size={14} color="#FFF" />
        </View>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fakeMap: { 
    flex: 1, 
    overflow: 'hidden',
    position: 'relative'
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  gridLineV: { position: 'absolute', width: 1, height: '100%', backgroundColor: 'rgba(0,0,0,0.03)' },
  gridLineH: { position: 'absolute', height: 1, width: '100%', backgroundColor: 'rgba(0,0,0,0.03)' },
  
  marker: { position: 'absolute', alignItems: 'center' },
  markerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  
  riderPin: { position: 'absolute', width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  riderIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 2,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  pulseCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    opacity: 0.3,
  },
  pathTrack: {
    position: 'absolute',
    height: 4,
    width: '70%',
    top: 225,
    left: 60,
    borderRadius: 2,
    opacity: 0.3,
    transform: [{ rotate: '25deg' }]
  },
  pathActive: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  }
});

export default DeliveryMap;
