import React, { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';

const MapEvents = ({ initialRegion, onRegionChangeComplete, isProgrammaticMove, MapComponents }) => {
  const { useMapEvents } = MapComponents;
  const lastEmittedCenter = useRef({ lat: initialRegion?.latitude || 18.48, lng: initialRegion?.longitude || -69.93 });
  
  const map = useMapEvents({
    moveend(e) {
      if (isProgrammaticMove.current) {
        isProgrammaticMove.current = false;
        return;
      }
      const center = e.target.getCenter();
      
      if (
        Math.abs(center.lat - lastEmittedCenter.current.lat) > 0.00005 || 
        Math.abs(center.lng - lastEmittedCenter.current.lng) > 0.00005
      ) {
        lastEmittedCenter.current = { lat: center.lat, lng: center.lng };
        if (onRegionChangeComplete) {
          onRegionChangeComplete({
            latitude: center.lat,
            longitude: center.lng,
          });
        }
      }
    }
  });
  return null;
};

const ChangeView = ({ center, isProgrammaticMove, MapComponents }) => {
  const map = MapComponents.useMap();
  useEffect(() => {
    // Fix Leaflet zero-size bug in modals
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    if (center && center[0] && center[1]) {
      const currentCenter = map.getCenter();
      if (Math.abs(currentCenter.lat - center[0]) > 0.00001 || Math.abs(currentCenter.lng - center[1]) > 0.00001) {
        isProgrammaticMove.current = true;
        map.setView(center, map.getZoom(), { animate: false });
      }
    }
    return () => clearTimeout(timer);
  }, [center[0], center[1], map]);
  return null;
};

export default function AppMap({ style, initialRegion, onRegionChangeComplete }) {
  const [MapComponents, setMapComponents] = useState(null);
  const isProgrammaticMove = useRef(false);

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

  const { MapContainer, TileLayer } = MapComponents;

  return (
    <View style={style}>
      <MapContainer 
        center={[initialRegion?.latitude || 18.48, initialRegion?.longitude || -69.93]} 
        zoom={15} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer 
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
          attribution="Google Maps"
        />
        <MapEvents 
          initialRegion={initialRegion} 
          onRegionChangeComplete={onRegionChangeComplete} 
          isProgrammaticMove={isProgrammaticMove} 
          MapComponents={MapComponents} 
        />
        <ChangeView 
          center={[initialRegion?.latitude || 18.48, initialRegion?.longitude || -69.93]} 
          isProgrammaticMove={isProgrammaticMove} 
          MapComponents={MapComponents} 
        />
      </MapContainer>
    </View>
  );
}
