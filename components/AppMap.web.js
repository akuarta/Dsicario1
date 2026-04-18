import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

export default function AppMap({ style, initialRegion, onRegionChangeComplete }) {
  const [MapComponents, setMapComponents] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const RL = require('react-leaflet');
      setMapComponents(RL);

      return () => {
        try { document.head.removeChild(link); } catch (e) {}
      };
    }
  }, []);

  if (!MapComponents) return <View style={style} ><Text>Cargando mapa web...</Text></View>;

  const { MapContainer, TileLayer, useMapEvents } = MapComponents;

  const MapEvents = () => {
    useMapEvents({
      moveend(e) {
        const center = e.target.getCenter();
        if (onRegionChangeComplete) {
          onRegionChangeComplete({
            latitude: center.lat,
            longitude: center.lng,
          });
        }
      }
    });
    return null;
  };

  return (
    <View style={style}>
      <MapContainer 
        center={[initialRegion?.latitude || 18.48, initialRegion?.longitude || -69.93]} 
        zoom={15} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents />
      </MapContainer>
    </View>
  );
}
