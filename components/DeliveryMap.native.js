import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesome5 } from '@expo/vector-icons';
import { decodePolyline } from '../utils/api';

/**
 * DeliveryMap - Versión Nativa (Android/iOS) con Google Maps Real
 */
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

  useEffect(() => {
    if (routeData?.polyline) {
      const points = decodePolyline(routeData.polyline);
      setRoutePoints(points);
      
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
        <Marker coordinate={origin} title={isPickup ? "Tu Ubicación" : "DSicario Local"}>
          <View style={[styles.markerIcon, { backgroundColor: colors.primary }]}>
            <FontAwesome5 name={isPickup ? "user-alt" : "store-alt"} size={14} color="#FFF" />
          </View>
        </Marker>

        <Marker coordinate={destination} title={isPickup ? "DSicario Local" : "Cliente"}>
          <View style={[styles.markerIcon, { backgroundColor: colors.accent }]}>
            <FontAwesome5 name={isPickup ? "store-alt" : "home"} size={14} color="#FFF" />
          </View>
        </Marker>

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
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
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
    elevation: 5
  }
});

export default DeliveryMap;
