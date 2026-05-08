import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassPanel from './GlassPanel';
import { decodePolyline } from '../utils/api';

/**
 * DeliveryMap - Versión Profesional con Google Maps
 */
const DeliveryMap = ({ 
  darkMode, 
  colors, 
  origin,
  destination,
  routeData, // { polyline, distance, duration }
  isPickup = false
}) => {
  const mapRef = useRef(null);
  const [routePoints, setRoutePoints] = useState([]);

  useEffect(() => {
    if (routeData?.polyline) {
      const points = decodePolyline(routeData.polyline);
      setRoutePoints(points);
      
      // Ajustar el mapa para mostrar toda la ruta
      if (mapRef.current && points.length > 0) {
        mapRef.current.fitToCoordinates(points, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
  }, [routeData]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMode ? darkMapStyle : []}
        initialRegion={{
          latitude: origin?.latitude || 18.486,
          longitude: origin?.longitude || -69.931,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Marcador de Origen (Local o Rider) */}
        <Marker 
          coordinate={origin} 
          title={isPickup ? "Tu Ubicación" : "DSicario Local"}
        >
          <View style={[styles.markerIcon, { backgroundColor: colors.primary }]}>
            <FontAwesome5 name={isPickup ? "user-alt" : "store-alt"} size={14} color="#FFF" />
          </View>
        </Marker>

        {/* Marcador de Destino (Cliente o Local) */}
        <Marker 
          coordinate={destination} 
          title={isPickup ? "DSicario Local" : "Cliente"}
        >
          <View style={[styles.markerIcon, { backgroundColor: colors.accent }]}>
            <FontAwesome5 name={isPickup ? "store-alt" : "home"} size={14} color="#FFF" />
          </View>
        </Marker>

        {/* Línea de la Ruta */}
        {routePoints.length > 0 && (
          <Polyline
            coordinates={routePoints}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
};

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 25 },
  map: { width: '100%', height: '100%' },
  markerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  webPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    padding: 20
  },
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
