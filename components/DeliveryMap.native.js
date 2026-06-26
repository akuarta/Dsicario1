import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { decodePolyline } from '../utils/api';
import { CONFIG } from '../constants/Config';
import { darkMapStyle, lightMapStyle } from '../constants/MapStyles';

const DeliveryMap = ({
  darkMode,
  colors,
  origin,
  destination,
  routeData,
  isPickup = false
}) => {
  const mapRef = useRef(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loaderOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (routeData?.polyline && typeof routeData.polyline === 'string' && routeData.polyline.length > 10) {
      try {
        const points = decodePolyline(routeData.polyline);
        if (Array.isArray(points) && points.length >= 2) {
          setRoutePoints(points);
          if (mapRef.current) {
            const allPoints = [];
            if (origin?.latitude) allPoints.push(origin);
            if (destination?.latitude) allPoints.push(destination);
            points.forEach(p => allPoints.push(p));
            if (allPoints.length >= 2) {
              setTimeout(() => {
                mapRef.current?.fitToCoordinates(allPoints, {
                  edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
                  animated: true,
                });
              }, 700);
            }
          }
        } else {
          setRoutePoints([]);
        }
      } catch (e) {
        console.error('[DeliveryMap] Error decoding polyline:', e.message);
        setRoutePoints([]);
      }
    } else {
      setRoutePoints([]);
    }
  }, [routeData]);

  useEffect(() => {
    if (mapReady) {
      Animated.timing(loaderOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    }
  }, [mapReady]);

  const centerMap = () => {
    if (mapRef.current) {
      const coords = routePoints.length > 0 ? routePoints : [origin, destination].filter(Boolean);
      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
          animated: true,
        });
      }
    }
  };

  const mapStyle = darkMode ? darkMapStyle : lightMapStyle;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        customMapStyle={mapStyle}
        onMapReady={() => setMapReady(true)}
        onError={(e) => setMapError(e)}
        initialRegion={{
          latitude: origin?.latitude || CONFIG.STORE_LOCATION.latitude,
          longitude: origin?.longitude || CONFIG.STORE_LOCATION.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        showsCompass={false}
        showsTraffic={false}
        showsBuildings={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        rotateEnabled={false}
      >
        {routePoints.length > 0 && (
          <>
            <Polyline coordinates={routePoints} strokeColor="rgba(0,0,0,0.18)" strokeWidth={8} zIndex={1} />
            <Polyline coordinates={routePoints} strokeColor={colors.primary} strokeWidth={5} zIndex={2} lineCap="round" lineJoin="round" />
            <Polyline coordinates={routePoints} strokeColor="rgba(255,255,255,0.35)" strokeWidth={2} zIndex={3} />
          </>
        )}

        {origin?.latitude && (
          <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
            <View style={styles.originMarkerWrapper}>
              <View style={[styles.originMarker, { backgroundColor: darkMode ? '#1C1C1E' : '#FFFFFF', borderColor: colors.primary }]}>
                <FontAwesome5 name={isPickup ? 'user-alt' : 'store-alt'} size={15} color={colors.primary} />
              </View>
              <View style={[styles.markerPin, { backgroundColor: colors.primary }]} />
            </View>
          </Marker>
        )}

        {destination?.latitude && (
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }} zIndex={11}>
            <View style={styles.destinationWrapper}>
              <Animated.View style={[
                styles.pulseRing,
                { borderColor: colors.primary, transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.35], outputRange: [0.45, 0] }) }
              ]} />
              <View style={[styles.destinationMarker, { backgroundColor: colors.primary }]}>
                <FontAwesome5 name={isPickup ? 'store-alt' : 'user-alt'} size={14} color="#FFF" />
              </View>
              <View style={[styles.markerPin, { backgroundColor: colors.primary }]} />
            </View>
          </Marker>
        )}
      </MapView>

      <Animated.View
        pointerEvents={mapReady ? 'none' : 'auto'}
        style={[StyleSheet.absoluteFill, styles.loadingOverlay, { opacity: loaderOpacity }]}
      >
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: darkMode ? '#FFF' : '#1A1A1A' }]}>Cargando mapa...</Text>
        </View>
      </Animated.View>

      {mapError && (
        <View style={[StyleSheet.absoluteFill, styles.errorOverlay]}>
          <View style={styles.errorCard}>
            <FontAwesome5 name="exclamation-triangle" size={36} color="#FF5252" />
            <Text style={styles.errorTitle}>Error al cargar el mapa</Text>
            <Text style={styles.errorText}>Verifica que la API Key de Google Maps esté activa.</Text>
          </View>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: darkMode ? '#2C2C2E' : '#FFFFFF' }]} onPress={centerMap}>
          <MaterialIcons name="my-location" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {routeData?.duration && (
        <View style={[styles.etaBadge, { backgroundColor: darkMode ? '#1C1C1E' : '#FFFFFF' }]}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={[styles.etaText, { color: darkMode ? '#FFF' : '#1A1A1A' }]}>{routeData.duration}</Text>
          {routeData?.distance && (
            <>
              <View style={[styles.etaDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.etaText, { color: colors.primary }]}>{routeData.distance}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 24 },
  map: { width: '100%', height: '100%' },
  originMarkerWrapper: { alignItems: 'center' },
  originMarker: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8,
  },
  destinationWrapper: { alignItems: 'center' },
  destinationMarker: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 10,
  },
  markerPin: { width: 4, height: 10, borderRadius: 2, marginTop: -2 },
  pulseRing: { position: 'absolute', top: -10, width: 62, height: 62, borderRadius: 31, borderWidth: 3 },
  controls: { position: 'absolute', right: 14, bottom: 14, gap: 10 },
  controlBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 6,
  },
  etaBadge: {
    position: 'absolute', bottom: 14, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  etaText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  etaDot: { width: 4, height: 4, borderRadius: 2 },
  loadingOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  loadingCard: {
    backgroundColor: '#1C1C1E', borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12,
  },
  loadingText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  errorOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
  errorCard: { backgroundColor: '#1C1C1E', borderRadius: 20, padding: 28, alignItems: 'center', gap: 12, maxWidth: 280 },
  errorTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  errorText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

export default DeliveryMap;
