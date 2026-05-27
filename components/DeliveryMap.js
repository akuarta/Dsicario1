import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, Animated } from 'react-native';
import GlassPanel from './GlassPanel';
import { decodePolyline } from '../utils/api';
import { CONFIG } from '../constants/Config';

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
    console.log('DeliveryMap: Received routeData', routeData ? 'YES' : 'NO');
    if (routeData?.polyline) {
      const points = decodePolyline(routeData.polyline);
      console.log('DeliveryMap: Decoded points count:', points.length);
      setRoutePoints(points);
      
      if (mapRef.current && points.length > 0) {
        setTimeout(() => {
          mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
            animated: true,
          });
        }, 500);
      }
    }
  }, [routeData]);

  const centerMap = () => {
    if (mapRef.current && routePoints.length > 0) {
      mapRef.current.fitToCoordinates(routePoints, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
  };

  if (Platform.OS === 'web') {
    const originStr = `${origin?.latitude},${origin?.longitude}`;
    const destStr = `${destination?.latitude},${destination?.longitude}`;
    const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=${CONFIG.GOOGLE_MAPS_API_KEY}&origin=${originStr}&destination=${destStr}&mode=driving`;

    return (
      <View style={[styles.container, { backgroundColor: darkMode ? '#1A1A1A' : '#F0F2F5' }]}>
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0, borderRadius: 25 }}
          loading="lazy"
          allowFullScreen
          src={mapUrl}
        />
        <View style={styles.webOverlay}>
          <GlassPanel intensity={20} style={styles.webBadge}>
            <Text style={{ fontSize: 10, color: colors.text.secondary, fontWeight: 'bold' }}>MODO WEB OPTIMIZADO</Text>
          </GlassPanel>
          
          <TouchableOpacity 
            style={[styles.precisionBtn, { marginTop: 10 }]}
            onPress={() => {
              // En web simplemente recargamos el iframe si quisiéramos, 
              // pero por ahora solo mostramos el feedback
              console.log('Precision pressed on web');
            }}
          >
            <MaterialIcons name="my-location" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
      
      {/* Botón de Precisión (Re-centrar) */}
      <TouchableOpacity 
        style={[styles.precisionBtn, { position: 'absolute', right: 20, top: 20 }]}
        onPress={centerMap}
      >
        <MaterialIcons name="my-location" size={24} color={colors.primary} />
      </TouchableOpacity>
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
  },
  precisionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  }
});

export default DeliveryMap;
