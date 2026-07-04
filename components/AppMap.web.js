import React, { forwardRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CONFIG } from '../constants/Config';

const AppMap = forwardRef(({
  darkMode,
  style,
  initialRegion,
  origin,
  destination,
  routeData,
  children,
  ...props
}, ref) => {
  const originKey = origin ? `${origin.latitude},${origin.longitude}` : '';
  const destKey = destination ? `${destination.latitude},${destination.longitude}` : '';

  console.log('[AppMap.web] render', { originKey, destKey, hasRouteData: !!routeData });

  let mapUrl;
  if (origin && destination) {
    mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${CONFIG.GOOGLE_MAPS_API_KEY}&origin=${originKey}&destination=${destKey}&mode=driving`;
  } else {
    const lat = initialRegion?.latitude || CONFIG.STORE_LOCATION.latitude;
    const lng = initialRegion?.longitude || CONFIG.STORE_LOCATION.longitude;
    mapUrl = `https://www.google.com/maps/embed/v1/view?key=${CONFIG.GOOGLE_MAPS_API_KEY}&center=${lat},${lng}&zoom=16&maptype=roadmap`;
  }

  const handlePrecision = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${originKey}&destination=${destKey}&travelmode=driving`, '_blank');
  };

  return (
    <View ref={ref} style={[styles.container, style]}>
      <iframe
        key={`${originKey}-${destKey}-${initialRegion?.latitude || ''}-${initialRegion?.longitude || ''}`}
        style={styles.iframe}
        loading="lazy"
        allowFullScreen
        src={mapUrl}
      />

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: darkMode ? '#2C2C2E' : '#FFFFFF' }]}
          onPress={handlePrecision}
        >
          <MaterialIcons name="my-location" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {routeData?.duration && (
        <View style={[styles.etaBadge, { backgroundColor: darkMode ? '#1C1C1E' : '#FFFFFF' }]}>
          <Text style={[styles.etaText, { color: darkMode ? '#FFF' : '#1A1A1A' }]}>
            {routeData.duration}
          </Text>
          {routeData?.distance && (
            <>
              <View style={[styles.etaDot, { backgroundColor: '#007AFF' }]} />
              <Text style={[styles.etaText, { color: '#007AFF' }]}>{routeData.distance}</Text>
            </>
          )}
        </View>
      )}

      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden', borderRadius: 24, width: '100%', height: '100%' },
  iframe: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 24 },
  controls: { position: 'absolute', right: 14, bottom: 14, gap: 10, zIndex: 10 },
  controlBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4,
  },
  etaBadge: {
    position: 'absolute', bottom: 14, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  etaText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  etaDot: { width: 4, height: 4, borderRadius: 2 },
});

export default AppMap;
