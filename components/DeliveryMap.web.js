import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

import GlassPanel from './GlassPanel';

/**
 * DeliveryMap - Versión Web (Usa Iframe de Google Maps)
 */
const DeliveryMap = ({ 
  darkMode, 
  colors, 
  origin,
  destination
}) => {
  const originStr = `${origin?.latitude},${origin?.longitude}`;
  const destStr = `${destination?.latitude},${destination?.longitude}`;
  const mapUrl = `https://maps.google.com/maps?saddr=${originStr}&daddr=${destStr}&output=embed`;

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#1A1A1A' : '#F0F2F5' }]}>
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0, borderRadius: 25 }}
        src={mapUrl}
        allowFullScreen
      ></iframe>
      <View style={styles.webOverlay}>
        <GlassPanel intensity={20} style={styles.webBadge}>
          <Text style={{ color: colors.text.primary, fontSize: 12, fontWeight: '600' }}>
            Vista Web Optimizada
          </Text>
        </GlassPanel>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 25 },
  webOverlay: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10
  },
  webBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  }
});

export default DeliveryMap;
