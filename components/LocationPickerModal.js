import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform, TextInput, FlatList, ActivityIndicator } from 'react-native';
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
      latitude: CONFIG.STORE_LOCATION.latitude,
      longitude: CONFIG.STORE_LOCATION.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }
  );
  
  const [address, setAddress] = useState('Buscando dirección...');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [showNearby, setShowNearby] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('establishment');
  const searchTimeout = useRef(null);
  const locationSub = useRef(null);
  const mapRef = useRef(null);

  const NEARBY_CATEGORIES = [
    { type: 'establishment', label: 'Todos', icon: 'map-marker-alt' },
    { type: 'restaurant', label: 'Restaurantes', icon: 'utensils' },
    { type: 'cafe', label: 'Cafeterías', icon: 'coffee' },
    { type: 'supermarket', label: 'Supermercados', icon: 'shopping-basket' },
    { type: 'pharmacy', label: 'Farmacias', icon: 'clinic-medical' },
    { type: 'gas_station', label: 'Gasolineras', icon: 'gas-pump' },
  ];

  useEffect(() => {
    if (visible) {
      startWatchingLocation();
      if (initialLocation) {
        setLocation({
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        reverseGeocode(initialLocation.latitude, initialLocation.longitude);
        fetchNearbyPlaces(initialLocation.latitude, initialLocation.longitude, selectedCategory);
      } else {
        getLocation();
      }
    } else {
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      if (locationSub.current) {
        locationSub.current.remove();
        locationSub.current = null;
      }
    }
    return () => {
      if (locationSub.current) {
        locationSub.current.remove();
        locationSub.current = null;
      }
    };
  }, [visible]);

  const startWatchingLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
      locationSub.current = sub;
    } catch (e) {
      console.warn('[LocationPicker] Error watching location:', e);
    }
  };

  const getCorsProxyUrl = (url) => {
    if (Platform.OS === 'web') {
      return `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      tryFetchNearby(selectedCategory);
      return;
    }
    setShowNearby(false);
    const loc = getSearchLocation();
    const lat = loc?.latitude || CONFIG.STORE_LOCATION.latitude;
    const lng = loc?.longitude || CONFIG.STORE_LOCATION.longitude;
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&language=es&location=${lat},${lng}&radius=50000&components=country:do&key=${CONFIG.GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(getCorsProxyUrl(url));
        const data = await res.json();
        if (data.predictions) {
          setSuggestions(data.predictions);
          setShowSuggestions(true);
        }
      } catch (e) {
        console.warn('[LocationPicker] Search error:', e);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectSuggestion = async (placeId) => {
    setShowSuggestions(false);
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${CONFIG.GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(getCorsProxyUrl(url));
      const data = await res.json();
      if (data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        const coords = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setLocation(coords);
        setAddress(data.result.formatted_address || 'Dirección seleccionada');
        setSearchQuery(data.result.name || '');
        mapRef.current?.animateToRegion?.(coords, 800);
      }
    } catch (e) {
      console.warn('[LocationPicker] Place details error:', e);
    } finally {
      setSearching(false);
    }
  };

  const getSearchLocation = () => {
    if (userLocation) return userLocation;
    if (location.latitude !== CONFIG.STORE_LOCATION.latitude || location.longitude !== CONFIG.STORE_LOCATION.longitude) return location;
    return null;
  };

  const fetchNearbyPlaces = async (lat, lng, type = 'establishment') => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=${type}&language=es&key=${CONFIG.GOOGLE_MAPS_API_KEY}`;
      console.log('[LocationPicker] Fetching nearby:', { lat, lng, type });
      const res = await fetch(getCorsProxyUrl(url));
      console.log('[LocationPicker] Response status:', res.status);
      const data = await res.json();
      console.log('[LocationPicker] NearbyPlaces full response:', JSON.stringify(data));
      if (data.results) {
        setNearbyPlaces(data.results.slice(0, 20));
        setShowNearby(true);
      }
    } catch (e) {
      console.warn('[LocationPicker] Nearby error:', e);
    }
  };

  const tryFetchNearby = (type) => {
    const loc = getSearchLocation();
    if (loc) {
      fetchNearbyPlaces(loc.latitude, loc.longitude, type);
    } else {
      setTimeout(() => {
        const retry = getSearchLocation();
        if (retry) fetchNearbyPlaces(retry.latitude, retry.longitude, type);
      }, 2000);
    }
  };

  const selectNearbyPlace = (place) => {
    const coords = {
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setLocation(coords);
    setAddress(place.vicinity ? `${place.name}, ${place.vicinity}` : place.name);
    setSearchQuery(place.name);
    setShowNearby(false);
    setShowSuggestions(false);
    mapRef.current?.animateToRegion?.(coords, 800);
  };

  const handleCategoryPress = (type) => {
    setSelectedCategory(type);
    tryFetchNearby(type);
  };

  const handleSearchFocus = () => {
    if (!searchQuery.trim() && nearbyPlaces.length === 0) {
      tryFetchNearby(selectedCategory);
    }
  };

  const dismissSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setNearbyPlaces([]);
    setShowNearby(false);
  };

  const getLocation = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setAddress('Geolocalización no disponible. Selecciona en el mapa.');
          setLoading(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (position.coords.accuracy > 1000) {
              console.warn('[LocationPicker] GPS accuracy too low:', position.coords.accuracy, 'm — using store location');
              const storeCoords = {
                latitude: CONFIG.STORE_LOCATION.latitude,
                longitude: CONFIG.STORE_LOCATION.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setLocation(storeCoords);
              reverseGeocode(storeCoords.latitude, storeCoords.longitude);
              mapRef.current?.animateToRegion?.(storeCoords, 800);
              fetchNearbyPlaces(storeCoords.latitude, storeCoords.longitude, selectedCategory);
              setLoading(false);
              return;
            }
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            setLocation(coords);
            reverseGeocode(coords.latitude, coords.longitude);
            mapRef.current?.animateToRegion?.(coords, 800);
            fetchNearbyPlaces(coords.latitude, coords.longitude, selectedCategory);
          },
          (error) => {
            console.warn('[LocationPicker] Geolocation error:', error);
            setAddress('Error obteniendo ubicación. Selecciona en el mapa.');
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
        return;
      }

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
      mapRef.current?.animateToRegion?.(coords, 800);
      fetchNearbyPlaces(coords.latitude, coords.longitude, selectedCategory);
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
       backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: height * 0.92,
    },
    header: {
       flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, zIndex: 10,
    },
    title: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
    closeBtn: { padding: 5 },
    searchContainer: { position: 'absolute', top: 55, left: 15, right: 15, zIndex: 2000 },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
    mapContainer: { flex: 1, position: 'relative' },
    map: { flex: 1 },
    markerFixed: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, },
    bottomPanel: { maxHeight: height * 0.4, borderTopWidth: 1, borderTopColor: colors.border },
    categoriesBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
    categoryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    categoryBtnLabel: { fontSize: 11, marginTop: 4, fontWeight: '500' },
    suggestionsList: { maxHeight: height * 0.2 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 0.5 },
    suggestionText: { fontSize: 14, flex: 1 },
    footerCompact: { padding: 12, paddingBottom: Platform.OS === 'web' ? 12 : 20, borderTopWidth: 1 },
    footerOverlay: { padding: 12, paddingBottom: Platform.OS === 'web' ? 12 : 20, borderTopWidth: 1 },
    addressLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 3 },
    addressText: { fontSize: 15, color: colors.text.primary, fontWeight: '500', marginBottom: 10 },
    confirmBtn: { backgroundColor: colors.primary, padding: 12, borderRadius: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
    webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    locateBtn: { position: 'absolute', bottom: 15, right: 15, backgroundColor: colors.primary, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, zIndex: 9999 },
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

          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FontAwesome5 name="search" size={14} color={colors.primary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text.primary }]}
                placeholder="Buscar dirección o lugar..."
                placeholderTextColor={colors.text.secondary}
                value={searchQuery}
                onChangeText={handleSearch}
                onFocus={handleSearchFocus}
                returnKeyType="search"
              />
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
              {(searchQuery.length > 0 || (showNearby || showSuggestions)) && !searching && (
                <TouchableOpacity onPress={dismissSearch}>
                  <FontAwesome5 name="times-circle" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.mapContainer}>
            <AppMap
              ref={mapRef}
              style={styles.map}
              darkMode={darkMode}
              initialRegion={location}
              onRegionChangeComplete={onRegionChangeComplete}
              showsUserLocation={true}
              userLocation={Platform.OS === 'web' ? userLocation : undefined}
            />
            <View style={styles.markerFixed}>
              <FontAwesome5 name="map-marker-alt" size={40} color={colors.primary} />
            </View>
            <TouchableOpacity 
              style={styles.locateBtn} 
              onPress={getLocation}
              disabled={loading}
            >
              <FontAwesome5 name="crosshairs" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {(showNearby || showSuggestions) && (
            <View style={[styles.bottomPanel, { backgroundColor: colors.surface }]}>
              {showNearby && !searchQuery.trim() && (
                <View style={styles.categoriesBar}>
                  {NEARBY_CATEGORIES.map((item) => (
                    <TouchableOpacity
                      key={item.type}
                      style={[styles.categoryBtn, {
                        backgroundColor: selectedCategory === item.type ? colors.primary : 'transparent',
                      }]}
                      onPress={() => handleCategoryPress(item.type)}
                    >
                      <FontAwesome5 name={item.icon} size={16} color={selectedCategory === item.type ? '#FFF' : colors.primary} />
                      <Text style={[styles.categoryBtnLabel, {
                        color: selectedCategory === item.type ? '#FFF' : colors.primary,
                      }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {showNearby && !searchQuery.trim() && (
                <FlatList
                  data={nearbyPlaces}
                  keyExtractor={(item) => item.place_id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionsList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                      onPress={() => selectNearbyPlace(item)}
                    >
                      <FontAwesome5 name="map-pin" size={14} color={colors.primary} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.suggestionText, { color: colors.text.primary, fontWeight: '600' }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.vicinity && (
                          <Text style={[styles.suggestionText, { color: colors.text.secondary, fontSize: 12 }]} numberOfLines={1}>
                            {item.vicinity}
                          </Text>
                        )}
                      </View>
                      {item.rating ? (
                        <Text style={{ color: colors.text.secondary, fontSize: 12, marginLeft: 5 }}>
                          {item.rating}★
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  )}
                />
              )}
              {showSuggestions && suggestions.length > 0 && (
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.place_id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionsList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                      onPress={() => selectSuggestion(item.place_id)}
                    >
                      <FontAwesome5 name="map-pin" size={14} color={colors.primary} style={{ marginRight: 12 }} />
                      <Text style={[styles.suggestionText, { color: colors.text.primary }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
              <View style={[styles.footerCompact, { borderTopColor: colors.border }]}>
                <Text style={styles.addressLabel}>Entregar en:</Text>
                <Text style={styles.addressText}>{address}</Text>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmLocation} disabled={loading}>
                  <Text style={styles.confirmBtnText}>{loading ? 'Cargando...' : 'Confirmar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!(showNearby || showSuggestions) && (
            <View style={[styles.footerOverlay, { backgroundColor: colors.surface }]}>
              <Text style={styles.addressLabel}>Entregar en:</Text>
              <Text style={styles.addressText}>{address}</Text>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmLocation} disabled={loading}>
                <Text style={styles.confirmBtnText}>{loading ? 'Cargando...' : 'Confirmar Ubicación'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ModalWrapper>
  );
};

export default LocationPickerModal;
