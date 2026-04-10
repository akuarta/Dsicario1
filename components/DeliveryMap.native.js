import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesome5 } from '@expo/vector-icons';

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];

const DeliveryMap = ({ darkMode, colors, pulseAnim }) => {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFillObject}
      customMapStyle={darkMode ? darkMapStyle : []}
      initialRegion={{
        latitude: 18.4861,
        longitude: -69.9312,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      <Marker coordinate={{ latitude: 18.4861, longitude: -69.9312 }}>
        <View style={[styles.markerShadow, { backgroundColor: colors.accent }]}>
          <FontAwesome5 name="store" size={12} color="#FFF" />
        </View>
      </Marker>
      <Marker coordinate={{ latitude: 18.4761, longitude: -69.9412 }} flat>
         <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[styles.markerShadow, { backgroundColor: colors.primary }]}>
              <FontAwesome5 name="motorcycle" size={12} color="#FFF" />
            </View>
         </Animated.View>
      </Marker>
      <Polyline
        coordinates={[
          { latitude: 18.4861, longitude: -69.9312 },
          { latitude: 18.4761, longitude: -69.9412 },
          { latitude: 18.4661, longitude: -69.9512 },
        ]}
        strokeColor={colors.primary}
        strokeWidth={3}
      />
    </MapView>
  );
};

const styles = StyleSheet.create({
  markerShadow: {
    padding: 8,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#FFF',
  },
});

export default DeliveryMap;
