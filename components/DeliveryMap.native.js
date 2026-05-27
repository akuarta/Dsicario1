import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { decodePolyline } from '../utils/api';

/**
 * DeliveryMap - Versión Nativa (Android/iOS) Optimizada
 * Incluye diagnóstico de carga para depurar problemas de API Key
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
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Decodificar la polilínea cuando cambie routeData
  useEffect(() => {
    if (routeData?.polyline) {
      console.log('DeliveryMap Native: Decodificando ruta...');
      const points = decodePolyline(routeData.polyline);
      setRoutePoints(points);
      
      if (mapRef.current && points.length > 0) {
        setTimeout(() => {
          mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
            animated: true,
          });
        }, 600);
      }
    }
  }, [routeData]);

  const centerMap = () => {
    if (mapRef.current && (routePoints.length > 0 || origin)) {
      const coords = routePoints.length > 0 ? routePoints : [origin, destination];
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
        animated: true,
      });
    }
  };

  const handleMapError = (error) => {
    console.error('Error en el mapa (Native):', error);
    setMapError(error);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMode ? darkMapStyle : []}
        onMapReady={() => {
          console.log('DeliveryMap Native: Mapa cargado correctamente');
          setMapReady(true);
        }}
        onMapLoaded={() => console.log('DeliveryMap Native: Tiles cargados')}
        onError={handleMapError}
        initialRegion={{
          latitude: origin?.latitude || 18.486,
          longitude: origin?.longitude || -69.931,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Marcador de Origen */}
        {origin && (
          <Marker coordinate={origin} title={isPickup ? "Tu Ubicación" : "DSicario Local"}>
            <View style={[styles.markerIcon, { backgroundColor: colors.primary }]}>
              <FontAwesome5 name={isPickup ? "user-alt" : "store-alt"} size={14} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Marcador de Destino */}
        {destination && (
          <Marker coordinate={destination} title={isPickup ? "DSicario Local" : "Cliente"}>
            <View style={[styles.markerIcon, { backgroundColor: colors.accent }]}>
              <FontAwesome5 name={isPickup ? "store-alt" : "home"} size={14} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Línea de la Ruta */}
        {routePoints.length > 0 && (
          <Polyline
            coordinates={routePoints}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Botón de Re-centrar */}
      <TouchableOpacity 
        style={[styles.precisionBtn, { position: 'absolute', right: 20, top: 20 }]}
        onPress={centerMap}
      >
        <MaterialIcons name="my-location" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* Overlay de carga o error */}
      {!mapReady && !mapError && (
        <View style={[StyleSheet.absoluteFill, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.text.secondary }}>Cargando mapa...</Text>
        </View>
      )}

      {mapError && (
        <View style={[StyleSheet.absoluteFill, styles.centered, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <FontAwesome5 name="exclamation-triangle" size={40} color="#FF5252" />
          <Text style={{ color: '#FFF', marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
            Error al cargar Google Maps. Verifica tu API Key y conexión.
          </Text>
        </View>
      )}
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
  centered: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  markerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 5
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
