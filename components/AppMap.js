import React from 'react';
import { Platform, View, Text } from 'react-native';

let MapView, PROVIDER_GOOGLE;
if (Platform.OS !== 'web') {
  MapView = require('react-native-maps').default;
  PROVIDER_GOOGLE = require('react-native-maps').PROVIDER_GOOGLE;
}

export default function AppMap(props) {
  if (Platform.OS === 'web') {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e9ecef', padding: 20 }, props.style]}>
        <Text style={{ fontSize: 18, color: '#495057', fontWeight: 'bold', marginBottom: 10 }}>📍 Ubicación Web</Text>
        <Text style={{ fontSize: 14, color: '#6c757d', textAlign: 'center', marginBottom: 20 }}>
          Usa la barra de búsqueda de arriba para encontrar tu dirección exacta.
        </Text>
        <Text style={{ fontSize: 12, color: '#adb5bd', textAlign: 'center' }}>
          También puedes tocar el botón de "Obtener ubicación actual" si le das permisos a tu navegador.
        </Text>
      </View>
    );
  }
  return <MapView provider={PROVIDER_GOOGLE} {...props} />;
}
