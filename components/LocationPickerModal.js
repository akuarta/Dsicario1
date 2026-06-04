import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import * as Location from 'expo-location';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors } from '../theme/theme';
import AppMap from './AppMap';
import { CONFIG } from '../constants/Config';

const { width, height } = Dimensions.get('window');

const LocationPickerModal = ({ visible, onClose, onLocationSelected, initialLocation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  const [location, setLocation] = useState(
    initialLocation || {
      latitude: 18.4861,
      longitude: -69.9312,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }
  );
  
  const [address, setAddress] = useState('Buscando dirección...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      if (initialLocation) {
        setLocation({
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        reverseGeocode(initialLocation.latitude, initialLocation.longitude);
      } else {
        getLocation();
      }
    }
  }, [visible]);

  const getLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Permiso denegado. Selecciona en el mapa.');
        setLoading(false);
        return;
      }

      let currentLoc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLoc.coords.latitude,
        longitude: currentLoc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setLocation(coords);
      reverseGeocode(coords.latitude, coords.longitude);
    } catch (e) {
      console.error(e);
      setAddress('Error obteniendo ubicación. Selecciona en el mapa.');
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      if (Platform.OS === 'web') {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${CONFIG.GOOGLE_MAPS_API_KEY}`;
        // Usar corsproxy.io que es mucho más estable que allorigins
        const fetchUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
        const res = await fetch(fetchUrl);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setAddress(data.results[0].formatted_address);
        } else {
          setAddress('Dirección desconocida');
        }
        setLoading(false);
        return;
      }

      let geocode = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const addr = `${place.street || ''} ${place.streetNumber || ''}, ${place.city || ''}, ${place.region || ''}`.trim().replace(/^,|,$/g, '').trim();
        setAddress(addr || 'Dirección desconocida');
      } else {
        setAddress('Dirección desconocida');
      }
    } catch (e) {
      console.error(e);
      setAddress('Error al obtener la dirección');
    }
    setLoading(false);
  };

  const onRegionChangeComplete = (region) => {
    setLocation(region);
    reverseGeocode(region.latitude, region.longitude);
  };

  const confirmLocation = () => {
    onLocationSelected({
      latitude: location.latitude,
      longitude: location.longitude,
      address,
    });
    onClose();
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
       flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    modalContainer: {
       backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: height * 0.8, overflow: 'hidden',
    },
    header: {
       flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: {
       fontSize: 18, fontWeight: 'bold', color: colors.text.primary,
    },
    closeBtn: { padding: 5 },
    mapContainer: { flex: 1, position: 'relative', backgroundColor: colors.background },
    map: { flex: 1 },
    markerFixed: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, },
    footer: { padding: 20, backgroundColor: colors.surface },
    addressLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 5 },
    addressText: { fontSize: 16, color: colors.text.primary, fontWeight: '500', marginBottom: 20 },
    confirmBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
    confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    locateBtn: { position: 'absolute', bottom: 20, right: 20, backgroundColor: colors.surface, padding: 15, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, zIndex: 1000 }
  }), [colors]);

  const ModalWrapper = Platform.OS === 'web' ? View : Modal;
  const modalProps = Platform.OS === 'web' 
    ? { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 } }
    : { visible, animationType: "slide", transparent: true };

  if (Platform.OS === 'web' && !visible) return null;

  return (
    <ModalWrapper {...modalProps}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Selecciona la ubicación</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome5 name="times" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <AppMap
              style={styles.map}
              initialRegion={location}
              onRegionChangeComplete={onRegionChangeComplete}
            />
            <View style={styles.markerFixed}>
              <FontAwesome5 name="map-marker-alt" size={40} color={colors.primary} />
            </View>
            <TouchableOpacity 
              style={styles.locateBtn} 
              onPress={getLocation}
              disabled={loading}
            >
              <FontAwesome5 name="crosshairs" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.addressLabel}>Entregar en:</Text>
            <Text style={styles.addressText}>{address}</Text>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={confirmLocation}
              disabled={loading}
            >
              <Text style={styles.confirmBtnText}>
                {loading ? 'Cargando...' : 'Confirmar Ubicación'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ModalWrapper>
  );
};

export default LocationPickerModal;
